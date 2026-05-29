const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const { enforceStoryAccess, incrementUsage, sendApiError } = require("./auth");

const durationTargets = {
  5: { words: 620, minWords: 560, maxWords: 700, paragraphs: 8 },
  10: { words: 1250, minWords: 1150, maxWords: 1380, paragraphs: 14 },
  15: { words: 1880, minWords: 1725, maxWords: 2070, paragraphs: 20 },
  20: { words: 2500, minWords: 2300, maxWords: 2760, paragraphs: 26 },
  30: { words: 3700, minWords: 3400, maxWords: 4050, paragraphs: 36 },
};

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList(values) {
  return Array.isArray(values) ? values.map((value) => cleanText(value)).filter(Boolean) : [];
}

function getTarget(duration) {
  return durationTargets[Number(duration)] || durationTargets[5];
}

function getMaxOutputTokens(duration) {
  return Math.min(Math.ceil(getTarget(duration).maxWords * 2.2), 18000);
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.refusal || "")
    .join("")
    .trim();
}

function getStoryModel() {
  const model = cleanText(process.env.OPENAI_STORY_MODEL, "gpt-4o-mini");
  const expensivePrototypeModels = new Set(["gpt-5.2", "gpt-5-mini"]);

  return expensivePrototypeModels.has(model) ? "gpt-4o-mini" : model;
}

function buildPrompt(data) {
  const target = getTarget(data.duration);
  const storyType = data.storyType === "bedtime" ? "bedtime story" : "anytime story";
  const moods = cleanList(data.moods);

  return [
    `Write a polished, imaginative children's ${storyType}.`,
    `Child name: ${cleanText(data.childName, "the child")}.`,
    `Child age: ${cleanText(data.childAge, "5")}.`,
    `Target duration: ${cleanText(data.duration, "5")} minutes of calm narrated audio.`,
    `Word count target: ${target.words} words. Acceptable range: ${target.minWords}-${target.maxWords} words.`,
    `Paragraph target: about ${target.paragraphs} short, readable paragraphs.`,
    `Mood blend: ${moods.length ? moods.join(", ") : "relaxing"}.`,
    `Story idea from parent: ${cleanText(data.storyIdea, "a gentle adventure with a kind positive ending")}.`,
    `Child interests: ${cleanText(data.interests, "not specified")}.`,
    `Topics to avoid: ${cleanText(data.avoidTopics, "none specified")}.`,
    `Preferred lesson: ${cleanText(data.preferredLesson, "a gentle moral that fits naturally")}.`,
    `Bedtime calm mode: ${data.calmMode ? "yes" : "no"}.`,
    "",
    "Quality requirements:",
    "- Make it feel like a real children's story, not a template.",
    "- Use warm, sensory, magical language with clear scenes and character moments.",
    "- Keep it age-appropriate, safe, non-frightening, and parent-friendly.",
    "- Give the child small choices, feelings, and discoveries.",
    "- Use short, gentle sentences with frequent natural pauses between phrases for bedtime narration.",
    "- Do not finish early. The story should feel complete and should land inside the requested word range.",
    "- Include a positive ending and a gentle lesson without sounding preachy.",
    "- For bedtime, slow the ending down and make the final paragraph peaceful.",
    "- Do not mention AI, prompts, packages, subscriptions, or app settings.",
  ].join("\n");
}

const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "paragraphs"],
  properties: {
    title: {
      type: "string",
      minLength: 3,
      maxLength: 90,
    },
    paragraphs: {
      type: "array",
      minItems: 4,
      maxItems: 80,
      items: {
        type: "string",
        minLength: 20,
        maxLength: 1200,
      },
    },
  },
};

async function createStory(data) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getStoryModel(),
      input: [
        {
          role: "developer",
          content:
            "You are DreamScapes, a careful children's story writer for parents. Always write safe, warm, age-appropriate stories and return only valid JSON matching the schema.",
        },
        {
          role: "user",
          content: buildPrompt(data),
        },
      ],
      max_output_tokens: getMaxOutputTokens(data.duration),
      text: {
        format: {
          type: "json_schema",
          name: "dreamscapes_story",
          strict: true,
          schema: storySchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Story request failed");
  }

  const result = await response.json();
  const text = extractResponseText(result);

  if (!text) {
    throw new Error(`Story model returned no text. Status: ${result.status || "unknown"}`);
  }

  const story = JSON.parse(text);

  return {
    title: cleanText(story.title, "A DreamScapes Story"),
    paragraphs: story.paragraphs.map((paragraph) => cleanText(paragraph)).filter(Boolean),
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const account = await enforceStoryAccess(request, body);
    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }
    const story = await createStory(body);
    const usage = await incrementUsage(account, { stories: 1 });

    return response.status(200).json({ ...story, usage });
  } catch (error) {
    return sendApiError(response, error, "Could not create story");
  }
};
