/* Draws the cover for one story.
 *
 * The key is server-side, so the picture is made here and handed back as
 * base64 for the client to shrink and put in the same storage bucket its audio
 * goes to. Nothing is stored here.
 *
 * This runs after the story has been written and shown, not before: a parent
 * waiting on a bedtime story should not also be waiting on a drawing. It costs
 * real money per story - see the note in the repo on unit economics - so it is
 * one image, once, at medium.
 */
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const { getAccountContext, handleCorsPreflight, sendApiError } = require("./auth");

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function getImageModel() {
  return cleanText(process.env.OPENAI_IMAGE_MODEL, "gpt-image-1");
}

/* One house style for every cover, so a library of them looks like a shelf
   rather than a pile. The story's own details only steer the subject. */
function buildImagePrompt(body) {
  const title = cleanText(body.title, "a gentle bedtime adventure");
  const summary = cleanText(body.summary);
  const interests = cleanText(body.interests);

  return [
    "A storybook cover illustration for a children's bedtime story.",
    `The story is called "${title}".`,
    summary ? `What happens in it: ${summary}` : "",
    interests ? `Things the child loves, which should appear naturally: ${interests}.` : "",
    "",
    "Style: soft painted storybook illustration, warm and calm, night-time palette of",
    "deep blues and violets lit by golden lamplight, gentle rounded shapes, dreamy and",
    "inviting. Think a picture book cover at bedtime.",
    "",
    "Rules:",
    "- No text, no letters, no numbers, no title, no watermark, no border.",
    "- No frightening, sad or dark imagery. Nothing with teeth bared, no peril, no weapons.",
    "- Show the scene, not a portrait: if a child appears, show them small, from behind or",
    "  in silhouette, never a face in close-up, so the picture fits any child.",
    "- Fill the frame edge to edge. It is cropped to a square and to a wide card.",
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    // An account, because the picture is kept in that account's storage. No
    // usage is counted: the story it belongs to was already counted when it
    // was written.
    await getAccountContext(request);

    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const result = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getImageModel(),
        prompt: buildImagePrompt(body),
        size: "1024x1024",
        quality: "medium",
        n: 1,
      }),
    });

    if (!result.ok) {
      const message = await result.text();
      throw new Error(message || "The cover could not be drawn.");
    }

    const payload = await result.json();
    // gpt-image-1 always answers in base64; there is no URL to follow.
    const image = payload?.data?.[0]?.b64_json;
    if (!image) throw new Error("No image came back.");

    return response.status(200).json({ image });
  } catch (error) {
    return sendApiError(response, error, "The cover could not be drawn just now.");
  }
};
