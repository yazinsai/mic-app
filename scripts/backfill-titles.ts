import "dotenv/config";
import { init, i } from "@instantdb/admin";

const GROQ_CHAT_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!appId || !adminToken) {
  throw new Error("Missing EXPO_PUBLIC_INSTANT_APP_ID or INSTANT_APP_ADMIN_TOKEN");
}

if (!groqKey) {
  throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY");
}

// Minimal schema for admin operations (avoid react-native import issues)
const schema = i.schema({
  entities: {
    recordings: i.entity({
      localFilePath: i.string(),
      duration: i.number(),
      createdAt: i.number().indexed(),
      sourceFingerprint: i.string().unique().indexed().optional(),
      transcription: i.string().optional(),
      title: i.string().optional(),
      status: i.string().indexed(),
      errorMessage: i.string().optional(),
      retryCount: i.number(),
      lastAttemptAt: i.number().optional(),
    }),
  },
});

const db = init({ appId, adminToken, schema });

async function generateTitle(transcription: string): Promise<string> {
  const truncatedText = transcription.slice(0, 500);

  const response = await fetch(GROQ_CHAT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a title generator. Given a voice note transcription, generate a short, descriptive title (maximum 6 words). Output ONLY the title, nothing else. No quotes, no punctuation at the end.",
        },
        {
          role: "user",
          content: truncatedText,
        },
      ],
      max_tokens: 30,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const title = data.choices?.[0]?.message?.content?.trim() || "";

  const words = title.split(/\s+/).slice(0, 6);
  return words.join(" ");
}

function looksLikeDefaultTitle(title: string, transcription: string): boolean {
  // Check if title matches first 4 words of transcription (the old fallback)
  const first4Words = transcription.trim().split(/\s+/).slice(0, 4).join(" ");
  const truncated = first4Words.length > 30 ? first4Words.slice(0, 30) : first4Words;
  return title === first4Words || title === truncated || title === truncated + "...";
}

async function backfillTitles() {
  console.log("Fetching recordings without AI-generated titles...");

  const result = await db.query({
    recordings: {
      $: {
        where: {
          transcription: { $isNull: false },
        },
      },
    },
  });

  const recordings = result.recordings;
  console.log(`Found ${recordings.length} recordings with transcriptions`);

  // Filter to those needing titles
  const needsTitle = recordings.filter((r) => {
    if (!r.transcription) return false;
    if (!r.title) return true;
    return looksLikeDefaultTitle(r.title, r.transcription);
  });

  console.log(`${needsTitle.length} recordings need title generation`);

  for (const recording of needsTitle) {
    if (!recording.transcription) continue;

    try {
      console.log(`Generating title for ${recording.id}...`);
      const title = await generateTitle(recording.transcription);
      console.log(`  -> "${title}"`);

      await db.transact(db.tx.recordings[recording.id].update({ title }));

      // Rate limiting - Groq has limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Failed to generate title for ${recording.id}:`, err);
    }
  }

  console.log("Done!");
}

backfillTitles();
