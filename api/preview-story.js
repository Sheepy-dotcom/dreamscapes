// One free story, no account required.
//
// This is the only endpoint that will talk to OpenAI without a signed-in user,
// so everything here exists to keep that from becoming a bill. Requests are
// capped per address and across the whole day, the generation is a single call
// rather than the retry-and-expand loop a paying user gets, and nothing is
// written to the story tables.

const crypto = require("crypto");
const { handleCorsPreflight, sendApiError, supabaseServiceRequest, ApiError } = require("./auth");
const { requestStory } = require("./story");

const PREVIEW_DURATION_MINUTES = 5;
// Deliberately loose. An address is not a person: a household shares one, an
// office shares one, and UK mobile carriers put thousands of subscribers behind
// a single address through carrier-grade NAT - so a parent tapping a link on
// mobile data can be refused for what three strangers on the same carrier did.
// This exists to stop scripted abuse; the global ceiling below is what actually
// bounds the bill, and the client keeps a per-device count for ordinary use.
const PREVIEW_IP_DAILY_LIMIT = 10;
const PREVIEW_GLOBAL_DAILY_LIMIT = 200;

// Addresses are hashed before they are stored. The salt only has to stop the
// stored hashes being reversible by guessing addresses, so a configured value
// is better but a constant is not a hole.
const IP_SALT = process.env.PREVIEW_IP_SALT || "dreamscapes-preview-v1";

// Only these reach the prompt, and only at these lengths. Anything else a
// caller sends is dropped rather than trusted.
const TEXT_FIELDS = {
  childName: 40,
  childAge: 20,
  interests: 200,
  storyIdea: 300,
  avoidTopics: 200,
  storyType: 20,
  storyLanguage: 10,
};

function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "");
  const first = forwarded.split(",")[0].trim();
  return first || request.socket?.remoteAddress || "unknown";
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

function buildPreviewRequest(body) {
  const data = {};

  for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
    const value = body[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, maxLength);
    if (trimmed) data[field] = trimmed;
  }

  if (Array.isArray(body.moods)) {
    data.moods = body.moods.filter((mood) => typeof mood === "string").slice(0, 3);
  }

  data.calmMode = Boolean(body.calmMode);

  // Not negotiable by the caller: the shortest story, and never any audio.
  data.duration = PREVIEW_DURATION_MINUTES;
  data.audioNarration = false;

  if (!data.childName) {
    throw new ApiError(400, "A child's name is needed to make a story.");
  }

  return data;
}

async function claimPreviewSlot(ipHash) {
  let rows;

  try {
    rows = await supabaseServiceRequest("/rest/v1/rpc/claim_preview_slot", {
      method: "POST",
      body: {
        p_ip_hash: ipHash,
        p_ip_limit: PREVIEW_IP_DAILY_LIMIT,
        p_global_limit: PREVIEW_GLOBAL_DAILY_LIMIT,
      },
    });
  } catch (error) {
    // Fail closed. Without a working counter there is no ceiling, and an
    // uncapped anonymous endpoint is worse than a briefly unavailable one.
    console.error(`[preview] Could not claim a slot, refusing: ${error.message}`);
    throw new ApiError(503, "Preview stories are unavailable right now. Please try again shortly.");
  }

  const result = Array.isArray(rows) ? rows[0] : rows;
  return {
    allowed: Boolean(result?.allowed),
    ipCount: Number(result?.ip_count || 0),
    globalCount: Number(result?.global_count || 0),
  };
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const data = buildPreviewRequest(body);
    const { allowed, ipCount, globalCount } = await claimPreviewSlot(hashIp(getClientIp(request)));

    if (!allowed) {
      const reachedGlobal = globalCount >= PREVIEW_GLOBAL_DAILY_LIMIT;
      console.warn(
        `[preview] Refused: ${reachedGlobal ? "daily ceiling" : "per-address limit"} reached ` +
          `(address ${ipCount}/${PREVIEW_IP_DAILY_LIMIT}, today ${globalCount}/${PREVIEW_GLOBAL_DAILY_LIMIT}).`
      );
      return response.status(429).json({
        error: reachedGlobal
          ? "DreamScapes has given away all of today's free stories. Create a free account to keep going."
          : "You have used all of today's free stories. Create a free account to keep going.",
        limit: reachedGlobal ? "global" : "address",
      });
    }

    if (globalCount >= PREVIEW_GLOBAL_DAILY_LIMIT * 0.8) {
      console.warn(`[preview] ${globalCount}/${PREVIEW_GLOBAL_DAILY_LIMIT} of today's ceiling used.`);
    }

    const story = await requestStory(data);

    return response.status(200).json({
      title: story.title,
      paragraphs: story.paragraphs,
      summary: story.summary || "",
      wordCount: story.wordCount || 0,
      preview: true,
      previewsLeft: Math.max(0, PREVIEW_IP_DAILY_LIMIT - ipCount),
    });
  } catch (error) {
    return sendApiError(response, error, "Could not create a preview story");
  }
};

module.exports.buildPreviewRequest = buildPreviewRequest;
