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
const { getAccountContext, handleCorsPreflight, sendApiError } = require("../lib/auth");

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
   rather than a pile. The story's own details only steer the subject.

   The "original characters" rule is not about principle, it is about getting
   a picture back at all. A story about a named franchise makes the model draw
   that franchise, and its own output filter then refuses to hand the image
   over: measured, a Pokemon story returned 400 moderation_blocked with
   moderation_stage "output", while the same prompt with the names taken out
   returned an image in 19 seconds. Asking for an original creature in that
   style keeps the cover personal and keeps it arriving. */
function buildImagePrompt(body, { safe = false } = {}) {
  const title = cleanText(body.title, "a gentle bedtime adventure");
  const summary = cleanText(body.summary);
  const interests = cleanText(body.interests);

  // Last resort, reached only when the first attempt was refused. Everything
  // the parent typed is dropped, names and interests alike - a named
  // franchise in the interests is exactly what got the first attempt blocked.
  // A plain bedtime scene is a worse cover than a personal one and a far
  // better cover than none.
  if (safe) {
    return [
      "A storybook cover illustration for a children's bedtime story.",
      "A calm, empty bedtime scene: a quiet bedroom window, soft blankets, a night sky.",
      "",
      "Style: soft painted storybook illustration, warm and calm, night-time palette of",
      "deep blues and violets lit by golden lamplight, gentle rounded shapes, dreamy and",
      "inviting. Think a picture book cover at bedtime.",
      "",
      "Rules:",
      "- Invent original characters and creatures. Do not draw any existing character,",
      "  mascot, logo, brand or franchise, and nothing recognisable from film, television,",
      "  games or toys.",
      "- No text, no letters, no numbers, no title, no watermark, no border.",
      "- No frightening, sad or dark imagery. No people's faces in close-up.",
      "- Fill the frame edge to edge. It is cropped to a square and to a wide card.",
    ]
      .filter(Boolean)
      .join("\n");
  }

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
    "- Invent original characters and creatures. If the story names something from a",
    "  film, game, show or toy line, draw an original character in that spirit instead -",
    "  never the real one, its logo, or anything a fan would recognise.",
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

    async function draw(safe) {
      return fetch(OPENAI_IMAGES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getImageModel(),
          prompt: buildImagePrompt(body, { safe }),
          size: "1024x1024",
          quality: "medium",
          n: 1,
        }),
      });
    }

    let result = await draw(false);

    // A blocked image is the one failure worth paying for twice: the story is
    // already written and saved, and the alternative is a shelf where some
    // stories have a cover and others never explain why they do not.
    if (!result.ok) {
      const first = await result.text();
      if (result.status === 400 && /moderation_blocked|safety system/i.test(first)) {
        console.warn("[story-image] first attempt blocked by moderation; retrying without story names.");
        result = await draw(true);
        if (!result.ok) {
          const second = await result.text();
          throw new Error(second || "The cover could not be drawn.");
        }
      } else {
        throw new Error(first || "The cover could not be drawn.");
      }
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
