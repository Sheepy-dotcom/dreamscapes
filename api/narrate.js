const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const { enforceNarrationAccess, incrementUsage, sendApiError } = require("./auth");
const MAX_CHUNK_LENGTH = 3800;
const MAX_CHUNKS = 20;
const SUPPORTED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

function cleanText(value) {
  return String(value || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitText(text) {
  const clean = cleanText(text);
  if (clean.length <= MAX_CHUNK_LENGTH) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks = [];
  let chunk = "";

  sentences.forEach((sentence) => {
    const nextChunk = `${chunk} ${sentence}`.trim();
    if (nextChunk.length > MAX_CHUNK_LENGTH && chunk) {
      chunks.push(chunk);
      chunk = sentence.trim();
      return;
    }

    chunk = nextChunk;
  });

  if (chunk) chunks.push(chunk);
  return chunks.slice(0, MAX_CHUNKS);
}

function getChunkInstructions(instructions, index, total) {
  if (total <= 1) return instructions;

  return [
    instructions,
    `This is narration part ${index + 1} of ${total}.`,
    "Keep exactly the same narrator identity, accent, age, pitch, pace, warmth, and microphone feel across every part.",
    "Continue as one continuous reading. Do not restart with a different character voice or change delivery between parts.",
  ].join(" ");
}

async function createSpeech({ input, voice, instructions, index = 0, total = 1 }) {
  const chunkInstructions = getChunkInstructions(instructions, index, total);
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input,
      instructions: chunkInstructions,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Narration request failed");
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const account = await enforceNarrationAccess(request, body);
    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }
    const text = cleanText(body.text);
    const voice = SUPPORTED_VOICES.has(body.voice) ? body.voice : "cedar";
    const instructions = cleanText(body.instructions).slice(0, 1000);

    if (!text) return response.status(400).json({ error: "Story text is required" });

    const chunks = splitText(text);
    const audio = [];

    for (let index = 0; index < chunks.length; index += 1) {
      audio.push(await createSpeech({ input: chunks[index], voice, instructions, index, total: chunks.length }));
    }

    const shouldChargeAudio = body.chargeAudio !== false;
    const usage = shouldChargeAudio
      ? await incrementUsage(account, { audioSeconds: account.requestedAudioSeconds })
      : account.usage;

    return response.status(200).json({
      audio,
      chunks: audio.length,
      voice,
      usage,
      charged: shouldChargeAudio,
      disclosure: "AI-generated narration",
    });
  } catch (error) {
    return sendApiError(response, error, "Could not create narration");
  }
};
