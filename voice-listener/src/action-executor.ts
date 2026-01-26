import { spawn } from "bun";
import { db } from "./db";

interface Action {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  projectPath?: string;
  messages?: string;
}

const POLL_INTERVAL = 5000; // 5 seconds
const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes for execution (longer than extraction)

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONCE = args.includes("--once");
const LIMIT = (() => {
  const idx = args.indexOf("--limit");
  if (idx !== -1 && args[idx + 1]) {
    return parseInt(args[idx + 1], 10);
  }
  return Infinity;
})();

async function recoverStaleActions(): Promise<void> {
  const now = Date.now();
  const result = await db.query({
    actions: {
      $: {
        where: {
          status: "in_progress",
        },
      },
    },
  });

  const actions = (result.actions ?? []) as (Action & { startedAt?: number })[];
  const stale = actions.filter(
    (a) => a.startedAt && now - a.startedAt > STALE_THRESHOLD
  );

  if (stale.length > 0) {
    console.log(`Recovering ${stale.length} stale actions...`);
    const txs = stale.map((a) =>
      db.tx.actions[a.id].update({
        status: "pending",
        startedAt: null,
      })
    );
    await db.transact(txs);
  }
}

async function claimAction(actionId: string): Promise<boolean> {
  try {
    await db.transact(
      db.tx.actions[actionId].update({
        status: "in_progress",
        startedAt: Date.now(),
      })
    );
    return true;
  } catch (error) {
    console.error(`Failed to claim action ${actionId}:`, error);
    return false;
  }
}

async function executeAction(action: Action): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Executing action: [${action.type.toUpperCase()}] ${action.title}`);
  if (action.description) {
    console.log(`Description: ${action.description}`);
  }
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would execute action ${action.id} (skipped)`);
    return;
  }

  // Claim the action
  const claimed = await claimAction(action.id);
  if (!claimed) {
    console.log(`Failed to claim action ${action.id}, skipping`);
    return;
  }

  // Build the prompt for Claude Code
  const prompt = buildExecutionPrompt(action);

  try {
    const proc = spawn({
      cmd: [
        "claude",
        "-p",
        prompt,
        "--dangerously-skip-permissions",
        "--output-format",
        "text",
      ],
      stdout: "pipe",
      stderr: "pipe",
      cwd: action.projectPath || process.cwd(),
    });

    // Stream output
    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      process.stdout.write(decoder.decode(value));
    }

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      console.error(`\nClaude exited with code ${exitCode}`);
      if (stderr) console.error("stderr:", stderr);

      await db.transact(
        db.tx.actions[action.id].update({
          status: "failed",
          errorMessage: `Exit code ${exitCode}: ${stderr.slice(0, 500)}`,
          completedAt: Date.now(),
        })
      );
    } else {
      console.log(`\nAction ${action.id} completed successfully`);
      // Note: Claude Code should update the action with result/deployUrl via InstantDB
      // We just mark it complete if it hasn't been updated
      const current = await db.query({
        actions: { $: { where: { id: action.id } } },
      });
      const currentAction = (current.actions as Action[])?.[0];
      if (currentAction?.status === "in_progress") {
        await db.transact(
          db.tx.actions[action.id].update({
            status: "completed",
            completedAt: Date.now(),
          })
        );
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error executing action ${action.id}:`, errMsg);
    await db.transact(
      db.tx.actions[action.id].update({
        status: "failed",
        errorMessage: errMsg,
        completedAt: Date.now(),
      })
    );
  }
}

function buildExecutionPrompt(action: Action): string {
  const messages = action.messages ? JSON.parse(action.messages) : [];
  const hasUserFeedback = messages.some((m: { role: string }) => m.role === "user");

  let prompt = `You are executing an action from the voice-to-action system.

ACTION DETAILS:
- ID: ${action.id}
- Type: ${action.type}
- Title: ${action.title}
${action.description ? `- Description: ${action.description}` : ""}

`;

  if (hasUserFeedback) {
    prompt += `CONVERSATION THREAD:
${messages.map((m: { role: string; content: string }) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n")}

The user has provided feedback. Continue iterating based on their input.
`;
  }

  prompt += `
INSTRUCTIONS:
1. Read the project's CLAUDE.md for context and guidelines
2. Execute this ${action.type} action appropriately:
   - idea: Build a prototype, make reasonable assumptions
   - bug: Investigate and fix
   - feature: Implement the feature
   - todo: Complete the task
   - command: Execute the command
3. Update the action in InstantDB as you work:
   - Use the db from voice-listener/src/db.ts
   - Update 'result' field with your progress/output
   - If you deploy something, set 'deployUrl'
   - Append assistant messages to the 'messages' JSON array
4. When done, set status to "completed"

To update the action in InstantDB:
\`\`\`typescript
import { db } from "./voice-listener/src/db";

// Update result
await db.transact(db.tx.actions["${action.id}"].update({
  result: "Description of what was done...",
  deployUrl: "http://...", // if deployed
}));

// Append a message to the thread
const messages = ${JSON.stringify(messages)};
messages.push({ role: "assistant", content: "Your response", timestamp: Date.now() });
await db.transact(db.tx.actions["${action.id}"].update({
  messages: JSON.stringify(messages),
}));
\`\`\`

Now execute this action.`;

  return prompt;
}

async function pollForActions(): Promise<number> {
  try {
    const result = await db.query({
      actions: {
        $: {
          where: {
            status: "pending",
          },
        },
      },
    });

    let actions = (result.actions ?? []) as Action[];

    if (actions.length === 0) {
      return 0;
    }

    console.log(`Found ${actions.length} pending action(s)`);

    // Apply limit
    if (LIMIT < actions.length) {
      console.log(`Limiting to ${LIMIT} action(s)`);
      actions = actions.slice(0, LIMIT);
    }

    // Execute one at a time
    for (const action of actions) {
      await executeAction(action);
    }

    return actions.length;
  } catch (error) {
    console.error("Polling error:", error);
    return 0;
  }
}

function printUsage(): void {
  console.log(`
Action Executor - Execute pending actions with Claude Code

Usage: bun run src/action-executor.ts [options]

Options:
  --dry-run     Show what would be executed without running
  --once        Process once and exit (don't poll continuously)
  --limit N     Only process N actions

Examples:
  bun run src/action-executor.ts --dry-run --once --limit 1
  bun run src/action-executor.ts --once --limit 5
  bun run src/action-executor.ts
`);
}

async function main(): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  console.log("Action Executor starting...");
  if (DRY_RUN) console.log("  Mode: DRY RUN (no changes will be made)");
  if (ONCE) console.log("  Mode: ONCE (will exit after processing)");
  if (LIMIT < Infinity) console.log(`  Limit: ${LIMIT}`);

  // Recover stale actions
  if (!DRY_RUN) {
    await recoverStaleActions();
  }

  console.log("\nPolling for pending actions...");

  // Initial poll
  const processed = await pollForActions();

  if (ONCE) {
    console.log(`\nDone. Processed ${processed} action(s).`);
    process.exit(0);
  }

  // Set up polling interval
  setInterval(pollForActions, POLL_INTERVAL);

  console.log(`\nListening for new actions (polling every ${POLL_INTERVAL / 1000}s)...`);
}

main().catch(console.error);
