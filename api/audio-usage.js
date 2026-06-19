const { enforceNarrationAccess, incrementUsage, sendApiError } = require("./auth");

function getAudioSeconds(body) {
  const seconds = Number(body.audioSeconds || body.audio_seconds || 0);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const audioSeconds = getAudioSeconds(body);
    const action = body.action === "complete" ? "complete" : "check";

    if (!audioSeconds) {
      return response.status(400).json({ error: "Audio duration is required" });
    }

    const account = await enforceNarrationAccess(request, {
      duration: audioSeconds / 60,
    });
    const usage =
      action === "complete"
        ? await incrementUsage(account, { audioSeconds })
        : account.usage;

    return response.status(200).json({
      ok: true,
      action,
      audioSeconds,
      usedAudioCredit: action === "complete" && Boolean(account.useAudioCredit),
      profile: account.profile,
      usage,
    });
  } catch (error) {
    return sendApiError(response, error, "Could not update audio usage");
  }
};
