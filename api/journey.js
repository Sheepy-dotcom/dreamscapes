/* Plans the seven nights of a journey in one go.
 *
 * The app used to improvise each night from the previous story's nextIdeas,
 * which is fine for a story but cannot show a parent the week they are being
 * asked to commit to. This writes the whole arc up front - seven titles and
 * teasers - so the offer screen can show what tomorrow and Sunday actually
 * hold, and so each night is written against a plan instead of whatever the
 * last night happened to end on.
 *
 * It runs on a deliberate tap, not on every story, and it costs a small
 * fraction of one: no paragraphs, just the shape of the week. It does not
 * touch the monthly story allowance - planning is not making - and the client
 * builds a plan of its own if this is unavailable, so the screen still works
 * signed out or offline.
 */
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const { getAccountContext, handleCorsPreflight, sendApiError } = require("../lib/auth");

const JOURNEY_NIGHTS = 7;

const storyLanguages = {
  "en-GB": "British English",
  "en-US": "American English",
  "es-ES": "Spanish",
  "fr-FR": "French",
  "de-DE": "German",
  "it-IT": "Italian",
  "pt-PT": "Portuguese",
  "nl-NL": "Dutch",
  "pl-PL": "Polish",
  "sv-SE": "Swedish",
};

const PRONOUNS = {
  she: "she/her",
  he: "he/him",
  they: "they/them",
};

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList(values) {
  return Array.isArray(values) ? values.map((value) => cleanText(value)).filter(Boolean) : [];
}

function getJourneyModel() {
  // Planning is a much smaller job than writing, so it does not need the story
  // model. OPENAI_JOURNEY_MODEL overrides when the default is retired.
  return cleanText(process.env.OPENAI_JOURNEY_MODEL, "gpt-5.6-luna");
}

function getJourneyModelCandidates() {
  const configured = getJourneyModel();
  const fallbacks = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-4.1-mini", "gpt-4o-mini"];
  return [configured, ...fallbacks].filter((model, index, all) => model && all.indexOf(model) === index);
}

const journeySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    seriesTitle: {
      type: "string",
      description: "A warm name for the whole seven-night journey. Four words at most.",
    },
    nights: {
      type: "array",
      minItems: JOURNEY_NIGHTS,
      maxItems: JOURNEY_NIGHTS,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
            description: "The name of this night's adventure. Two to four words, no night number.",
          },
          teaser: {
            type: "string",
            description: "One sentence, at most twenty words, saying what happens. No spoilers for the ending.",
          },
        },
        required: ["title", "teaser"],
      },
    },
  },
  required: ["seriesTitle", "nights"],
};

function buildJourneyPrompt(data) {
  const language = storyLanguages[cleanText(data.storyLanguage, "en-GB")] || storyLanguages["en-GB"];
  const childName = cleanText(data.childName, "the child");
  const interests = cleanList(data.interests ? [data.interests] : []).join(", ");
  const pronouns = PRONOUNS[cleanText(data.pronouns).toLowerCase()];

  return [
    `Plan a ${JOURNEY_NIGHTS}-night bedtime story journey for a child.`,
    `Language: ${language}. Write the titles and teasers in that language.`,
    `Child name: ${childName}.`,
    pronouns
      ? `Child pronouns: ${pronouns}. Use them for ${childName} and no others.`
      : `Child pronouns: not given. Do not guess from the name - use ${childName}'s name or they/them, and no gendered words.`,
    `Child age: ${cleanText(data.childAge, "young child")}.`,
    `Things they love: ${interests || "not specified"}.`,
    `Tonight's story, which is night 1 and has already been read: "${cleanText(
      data.storyTitle,
      "an opening adventure"
    )}".`,
    `What happened in it: ${cleanText(data.storySummary, "a gentle adventure with a kind ending")}.`,
    "",
    "Rules:",
    `- Return exactly ${JOURNEY_NIGHTS} nights. Night 1 must be the story above, retold as a title and teaser, not a new adventure.`,
    "- Nights 2 to 7 carry the same characters forward into new places. Each one must be its own adventure with its own small discovery, not a continuation sentence.",
    "- Build gently. The middle nights can be the most exciting; night 7 must be the warmest and most settling, and should bring the journey to a close.",
    "- Titles are places, things or moments - \"The floating islands\", \"The midnight market\". Never \"Night 4\" or \"Part Four\", and never the child's name.",
    "- Teasers are one sentence, present tense, and must read like a promise a parent would want to keep.",
    "- Keep everything calm, kind and age-appropriate. No peril, no villains, nothing frightening at bedtime.",
    data.avoidTopics ? `- Never include: ${cleanText(data.avoidTopics)}.` : "",
    "- Return only valid JSON matching the supplied schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.refusal || "")
    .join("")
    .trim();
}

async function planJourney(data) {
  const candidates = getJourneyModelCandidates();
  let lastError = null;

  for (const model of candidates) {
    const requestBody = {
      model,
      input: [
        {
          role: "developer",
          content:
            "You are DreamScapes, planning a week of bedtime stories for one child. You are naming adventures, not writing them. Every night must feel worth staying up for and safe to fall asleep to. Return only valid JSON matching the supplied schema.",
        },
        { role: "user", content: buildJourneyPrompt(data) },
      ],
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "dreamscapes_journey",
          strict: true,
          schema: journeySchema,
        },
      },
    };

    if (model.startsWith("gpt-5")) {
      requestBody.reasoning = { effort: "low" };
      requestBody.prompt_cache_key = "dreamscapes-journey-v1";
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const message = await response.text();
      lastError = new Error(message || "Journey request failed");
      // A model that is retired, unknown, or not available to this key is worth
      // stepping past; anything else is a real failure and the client's own
      // plan is a better answer than a retry storm.
      if (response.status === 404 || response.status === 400 || response.status === 403) continue;
      throw lastError;
    }

    const payload = await response.json();
    const parsed = JSON.parse(extractResponseText(payload) || "{}");
    const nights = Array.isArray(parsed.nights) ? parsed.nights : [];
    if (nights.length !== JOURNEY_NIGHTS) {
      lastError = new Error("Journey plan came back the wrong length");
      continue;
    }

    return {
      seriesTitle: cleanText(parsed.seriesTitle, "A Seven-Night DreamScape"),
      nights: nights.map((night, index) => ({
        night: index + 1,
        title: cleanText(night.title, `Night ${index + 1}`),
        teaser: cleanText(night.teaser),
      })),
    };
  }

  throw lastError || new Error("No journey model was available");
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    // Planning needs an account because a journey is a week-long commitment
    // tied to a library and a reminder, but it deliberately does not call
    // incrementUsage: no story has been written yet.
    await getAccountContext(request);

    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const plan = await planJourney(body);
    return response.status(200).json(plan);
  } catch (error) {
    return sendApiError(response, error, "We could not plan the journey just now.");
  }
};

module.exports.JOURNEY_NIGHTS = JOURNEY_NIGHTS;
