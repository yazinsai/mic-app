/**
 * Log Watcher - Tails action execution logs and updates InstantDB with progress
 *
 * This script:
 * 1. Polls for in_progress actions that have a logFile path
 * 2. Tails each log file for new content
 * 3. Parses important events (tool uses, todos, thinking summaries)
 * 4. Updates the action's `progress` field in InstantDB
 */

import { resolve, basename } from "path";
import { stat, open } from "fs/promises";
import { db } from "./db";

interface Action {
  id: string;
  status: string;
  logFile?: string;
  progress?: string;
}

interface Progress {
  currentTask?: string;
  todos?: Array<{ content: string; status: string }>;
  recentTools?: Array<{ name: string; timestamp: number }>;
  lastThinkingSummary?: string;
  lastUpdate: number;
}

interface WatchedFile {
  actionId: string;
  path: string;
  position: number; // Bytes read so far
  progress: Progress;
}

const POLL_INTERVAL = 2000; // Check for new actions every 2 seconds
const TAIL_INTERVAL = 500; // Tail logs every 500ms
const UPDATE_DEBOUNCE = 1000; // Debounce DB updates

// CLI args
const args = process.argv.slice(2);
const ONCE = args.includes("--once");
const VERBOSE = args.includes("--verbose");

// Track watched files by action ID
const watchedFiles = new Map<string, WatchedFile>();

// Track pending updates to debounce
const pendingUpdates = new Map<string, ReturnType<typeof setTimeout>>();

function log(msg: string) {
  console.log(`[log-watcher] ${msg}`);
}

function debug(msg: string) {
  if (VERBOSE) {
    console.log(`[log-watcher:debug] ${msg}`);
  }
}

/**
 * Parse a line from the log file and extract important information
 */
function parseLine(line: string, progress: Progress): boolean {
  let changed = false;

  // Parse tool_use blocks
  const toolMatch = line.match(/<tool_use name="([^"]+)">/);
  if (toolMatch) {
    const toolName = toolMatch[1];
    if (!progress.recentTools) progress.recentTools = [];
    progress.recentTools.push({ name: toolName, timestamp: Date.now() });
    // Keep only last 10 tools
    if (progress.recentTools.length > 10) {
      progress.recentTools = progress.recentTools.slice(-10);
    }
    changed = true;
    debug(`Tool use: ${toolName}`);
  }

  // Parse TodoWrite tool to extract todos
  if (line.includes('"todos":') || line.includes('"content":')) {
    try {
      // Try to find JSON in the line
      const jsonMatch = line.match(/\{[\s\S]*"todos"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.todos && Array.isArray(parsed.todos)) {
          progress.todos = parsed.todos.map((t: { content: string; status: string }) => ({
            content: t.content,
            status: t.status,
          }));
          // Find current task (in_progress)
          const current = parsed.todos.find((t: { status: string }) => t.status === "in_progress");
          if (current) {
            progress.currentTask = current.activeForm || current.content;
          }
          changed = true;
          debug(`Todos updated: ${progress.todos?.length ?? 0} items`);
        }
      }
    } catch {
      // Not valid JSON, ignore
    }
  }

  // Parse thinking blocks - extract first line as summary
  const thinkingMatch = line.match(/<thinking>\n?(.*)/);
  if (thinkingMatch && thinkingMatch[1]) {
    const summary = thinkingMatch[1].slice(0, 200);
    if (summary.trim()) {
      progress.lastThinkingSummary = summary;
      changed = true;
      debug(`Thinking: ${summary.slice(0, 50)}...`);
    }
  }

  // Parse event comments for tool results with newTodos
  const eventMatch = line.match(/<!-- event: (\{.*\}) -->/);
  if (eventMatch) {
    try {
      const event = JSON.parse(eventMatch[1]);
      if (event.tool_use_result?.newTodos) {
        progress.todos = event.tool_use_result.newTodos.map((t: { content: string; status: string }) => ({
          content: t.content,
          status: t.status,
        }));
        const current = event.tool_use_result.newTodos.find(
          (t: { status: string }) => t.status === "in_progress"
        );
        if (current) {
          progress.currentTask = current.activeForm || current.content;
        }
        changed = true;
        debug(`Todos from event: ${progress.todos?.length ?? 0} items`);
      }
    } catch {
      // Not valid JSON, ignore
    }
  }

  return changed;
}

/**
 * Tail a log file from the last known position
 */
async function tailFile(watched: WatchedFile): Promise<boolean> {
  try {
    const stats = await stat(watched.path);
    if (stats.size <= watched.position) {
      return false; // No new content
    }

    // Read new content
    const fileHandle = await open(watched.path, "r");
    const buffer = Buffer.alloc(stats.size - watched.position);
    await fileHandle.read(buffer, 0, buffer.length, watched.position);
    await fileHandle.close();

    const newContent = buffer.toString("utf-8");
    const lines = newContent.split("\n");

    let changed = false;
    for (const line of lines) {
      if (parseLine(line, watched.progress)) {
        changed = true;
      }
    }

    watched.position = stats.size;
    watched.progress.lastUpdate = Date.now();

    return changed;
  } catch (error) {
    debug(`Error tailing ${watched.path}: ${error}`);
    return false;
  }
}

/**
 * Update the action's progress field in InstantDB (debounced)
 */
function scheduleUpdate(actionId: string, progress: Progress) {
  // Cancel any pending update
  const existing = pendingUpdates.get(actionId);
  if (existing) {
    clearTimeout(existing);
  }

  // Schedule new update
  const timeout = setTimeout(async () => {
    pendingUpdates.delete(actionId);
    try {
      await db.transact(
        db.tx.actions[actionId].update({
          progress: JSON.stringify(progress),
        })
      );
      debug(`Updated progress for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to update progress for ${actionId}:`, error);
    }
  }, UPDATE_DEBOUNCE);

  pendingUpdates.set(actionId, timeout);
}

/**
 * Poll for in_progress actions and start watching their log files
 */
async function pollForActions(): Promise<number> {
  try {
    const result = await db.query({
      actions: {
        $: {
          where: {
            status: "in_progress",
          },
        },
      },
    });

    const actions = (result.actions ?? []) as Action[];
    let newWatches = 0;

    // Start watching any new actions with log files
    for (const action of actions) {
      if (action.logFile && !watchedFiles.has(action.id)) {
        log(`Starting to watch: ${basename(action.logFile)}`);
        watchedFiles.set(action.id, {
          actionId: action.id,
          path: action.logFile,
          position: 0,
          progress: {
            lastUpdate: Date.now(),
          },
        });
        newWatches++;
      }
    }

    // Stop watching completed/failed actions
    const activeIds = new Set(actions.map((a) => a.id));
    for (const [actionId, watched] of watchedFiles) {
      if (!activeIds.has(actionId)) {
        log(`Stopped watching: ${basename(watched.path)} (action no longer in_progress)`);
        watchedFiles.delete(actionId);
        // Cancel any pending update
        const pending = pendingUpdates.get(actionId);
        if (pending) {
          clearTimeout(pending);
          pendingUpdates.delete(actionId);
        }
      }
    }

    return newWatches;
  } catch (error) {
    console.error("Polling error:", error);
    return 0;
  }
}

/**
 * Tail all watched files
 */
async function tailAll(): Promise<void> {
  for (const [actionId, watched] of watchedFiles) {
    const changed = await tailFile(watched);
    if (changed) {
      scheduleUpdate(actionId, watched.progress);
    }
  }
}

function printUsage(): void {
  console.log(`
Log Watcher - Tail action logs and update InstantDB with progress

Usage: bun run src/log-watcher.ts [options]

Options:
  --once      Process once and exit
  --verbose   Show debug output

This script watches for in_progress actions with a logFile path,
tails the log files, parses important events (tool uses, todos, etc.),
and updates the action's progress field in InstantDB.
`);
}

async function main(): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  log("Starting...");
  if (ONCE) log("  Mode: ONCE (will exit after processing)");
  if (VERBOSE) log("  Verbose: ENABLED");

  // Initial poll
  await pollForActions();

  if (ONCE) {
    // Do one round of tailing
    await tailAll();
    // Flush any pending updates
    for (const [actionId, timeout] of pendingUpdates) {
      clearTimeout(timeout);
      const watched = watchedFiles.get(actionId);
      if (watched) {
        await db.transact(
          db.tx.actions[actionId].update({
            progress: JSON.stringify(watched.progress),
          })
        );
      }
    }
    log("Done.");
    process.exit(0);
  }

  // Set up polling intervals
  setInterval(pollForActions, POLL_INTERVAL);
  setInterval(tailAll, TAIL_INTERVAL);

  log(`Watching for action logs (poll: ${POLL_INTERVAL / 1000}s, tail: ${TAIL_INTERVAL}ms)...`);
}

main().catch(console.error);
