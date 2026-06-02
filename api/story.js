const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const { enforceStoryAccess, incrementUsage, sendApiError, supabaseRequest } = require("./auth");

const durationTargets = {
  5: { words: 850, minWords: 760, maxWords: 980, paragraphs: 10 },
  10: { words: 1700, minWords: 1520, maxWords: 1950, paragraphs: 18 },
  15: { words: 2600, minWords: 2350, maxWords: 2950, paragraphs: 28 },
  20: { words: 3600, minWords: 3250, maxWords: 4100, paragraphs: 38 },
  30: { words: 5400, minWords: 4900, maxWords: 6100, paragraphs: 56 },
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
  return Math.min(Math.ceil(getTarget(duration).maxWords * 2.6), 24000);
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
  const retryNote = data.enforceWordCount
    ? [
        "",
        "Length correction:",
        `- The previous draft was too short for ${cleanText(data.duration, "5")} minutes.`,
        `- This rewrite must be at least ${target.minWords} words and should aim for ${target.words} words.`,
        "- Add more warm scene detail, character moments, dialogue, gentle discoveries, and cosy transitions while keeping the ending positive.",
        "- Do not summarise scenes. Let each scene play out with enough detail for calm audio narration.",
      ]
    : [];

  return [
    `Write a polished, imaginative children's ${storyType}.`,
    `Child name: ${cleanText(data.childName, "the child")}.`,
    `Child age: ${cleanText(data.childAge, "5")}.`,
    `Target duration: ${cleanText(data.duration, "5")} minutes of calm narrated audio.`,
    `Word count target: ${target.words} words. Acceptable range: ${target.minWords}-${target.maxWords} words.`,
    `Paragraph target: about ${target.paragraphs} short, readable paragraphs.`,
    "Timing rule: the selected duration is for narrated audio, so the story must be long enough when read aloud slowly.",
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
    "- Longer durations must include more complete scenes, not just longer sentences.",
    "- Include a positive ending and a gentle lesson without sounding preachy.",
    "- For bedtime, slow the ending down and make the final paragraph peaceful.",
    "- Do not mention AI, prompts, packages, subscriptions, or app settings.",
    ...retryNote,
  ].join("\n");
}

function countWords(paragraphs) {
  return paragraphs
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function normaliseStoryType(value) {
  return value === "anytime" ? "anytime" : "bedtime";
}

function normalisePlan(value) {
  return ["free", "premier", "plus"].includes(value) ? value : "free";
}

function storyToRow({ account, body, story }) {
  return {
    user_id: account.user.id,
    title: story.title,
    child_name: cleanText(body.childName, "the child"),
    child_age: cleanText(body.childAge) || null,
    story_type: normaliseStoryType(body.storyType),
    duration_minutes: Number(body.duration) || 5,
    moods: cleanList(body.moods),
    story_idea: cleanText(body.storyIdea) || null,
    paragraphs: story.paragraphs || [],
    word_count: story.wordCount || null,
    plan: normalisePlan(account.profile?.plan || body.plan),
    voice_style: cleanText(body.voiceStyle) || null,
    audio_requested: Boolean(body.audioNarration),
    audio_paths: [],
    audio_track_durations: [],
    audio_duration_seconds: null,
    audio_generated_at: null,
    created_at: new Date().toISOString(),
  };
}

async function saveGeneratedStory(account, body, story) {
  if (!account.plan?.canSave) return null;

  const row = storyToRow({ account, body, story });
  const insert = async (payload) =>
    supabaseRequest("/rest/v1/stories?select=*", {
      token: account.token,
      method: "POST",
      prefer: "return=representation",
      body: payload,
    });

  try {
    const saved = await insert(row);
    return saved?.[0] || null;
  } catch (error) {
    if (!String(error.message || "").includes("word_count")) throw error;
    const fallbackRow = { ...row };
    delete fallbackRow.word_count;
    const saved = await insert(fallbackRow);
    return saved?.[0] || null;
  }
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

async function requestStory(data) {
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
  const paragraphs = story.paragraphs.map((paragraph) => cleanText(paragraph)).filter(Boolean);

  return {
    title: cleanText(story.title, "A DreamScapes Story"),
    paragraphs,
    wordCount: countWords(paragraphs),
  };
}

async function createStory(data) {
  const target = getTarget(data.duration);
  let story = await requestStory(data);

  for (let attempt = 0; attempt < 2 && story.wordCount < target.minWords; attempt += 1) {
    const retry = await requestStory({ ...data, enforceWordCount: true });
    story = retry.wordCount > story.wordCount ? retry : story;
  }

  return {
    ...story,
    durationTarget: {
      minutes: Number(data.duration) || 5,
      words: target.words,
      minWords: target.minWords,
      maxWords: target.maxWords,
    },
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
    let savedStory = null;
    let saveError = "";
    try {
      savedStory = await saveGeneratedStory(account, body, story);
    } catch (error) {
      saveError = error.message || "Story save failed";
    }
    const usage = await incrementUsage(account, { stories: 1 });

    return response.status(200).json({
      ...story,
      cloudId: savedStory?.id || null,
      savedAt: savedStory?.updated_at || savedStory?.created_at || null,
      saveError,
      usage,
    });
  } catch (error) {
    return sendApiError(response, error, "Could not create story");
  }
};
