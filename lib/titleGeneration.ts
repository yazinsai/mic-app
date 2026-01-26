const GROQ_CHAT_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generateTitle(transcription: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  // Truncate long transcriptions to save tokens
  const truncatedText = transcription.slice(0, 500);

  const response = await fetch(GROQ_CHAT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  // Ensure title is reasonable length (max 6 words)
  const words = title.split(/\s+/).slice(0, 6);
  return words.join(" ");
}
