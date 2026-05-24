const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const durationTargets = {
  5: { words: 650, paragraphs: 7 },
  10: { words: 1200, paragraphs: 10 },
  15: { words: 1800, paragraphs: 14 },
  20: { words: 2400, paragraphs: 18 },
  30: { words: 3200, paragraphs: 24 },
  45: { words: 4200, paragraphs: 32 },
  60: { words: 5200, paragraphs: 40 },
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

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

function buildPrompt(data) {
  const target = getTarget(data.duration);
  const storyType = data.storyType === "bedtime" ? "bedtime story" : "anytime story";
  const moods = cleanList(data.moods);

  return [
    `Write a polished, imaginative children's ${storyType}.`,
    `Child name: ${cleanText(data.childName, "the child")}.`,
    `Child age: ${cleanText(data.childAge, "5")}.`,
    `Target duration: ${cleanText(data.duration, "5")} minutes, about ${target.words} words.`,
    `Paragraph target: ${target.paragraphs} short, readable paragraphs.`,
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
      maxItems: 45,
      items: {
        type: "string",
        minLength: 20,
        maxLength: 900,
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
      model: process.env.OPENAI_STORY_MODEL || "gpt-5.2",
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
      max_output_tokens: Math.min(getTarget(data.duration).words * 2, 9000),
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

  if (!process.env.OPENAI_API_KEY) {
    return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const story = await createStory(body);

    return response.status(200).json(story);
  } catch (error) {
    return response.status(500).json({
      error: "Could not create story",
      detail: error.message,
    });
  }
};
