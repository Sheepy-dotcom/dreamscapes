const {
  getAccountContext,
  sendApiError,
  supabaseServiceRequest,
} = require("./auth");

function normaliseCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const code = normaliseCode(body.code);

    if (!code) {
      return response.status(400).json({ error: "Enter a redeem code." });
    }

    const account = await getAccountContext(request);
    const encodedCode = encodeURIComponent(code);
    const codes = await supabaseServiceRequest(
      `/rest/v1/redeem_codes?code=eq.${encodedCode}&active=eq.true&select=*`
    );
    const redeemCode = codes?.[0];

    if (!redeemCode) {
      return response.status(404).json({ error: "That code is not valid." });
    }

    if (redeemCode.expires_at && new Date(redeemCode.expires_at).getTime() < Date.now()) {
      return response.status(410).json({ error: "That code has expired." });
    }

    if (
      Number.isFinite(Number(redeemCode.max_redemptions)) &&
      Number(redeemCode.max_redemptions) > 0 &&
      Number(redeemCode.times_redeemed || 0) >= Number(redeemCode.max_redemptions)
    ) {
      return response.status(409).json({ error: "That code has already been fully used." });
    }

    const previousRedemptions = await supabaseServiceRequest(
      `/rest/v1/redeem_code_redemptions?redeem_code_id=eq.${redeemCode.id}&user_id=eq.${account.user.id}&select=id`
    );

    if (previousRedemptions?.length) {
      return response.status(409).json({ error: "You have already used this code." });
    }

    const audioCreditsToAdd = Math.max(0, Number(redeemCode.audio_story_credits || 0));
    if (audioCreditsToAdd <= 0) {
      return response.status(400).json({ error: "This code is not set up with any credits yet." });
    }

    const currentCredits = Math.max(0, Number(account.profile?.audio_story_credits || 0));
    const nextCredits = currentCredits + audioCreditsToAdd;
    const updatedProfiles = await supabaseServiceRequest(`/rest/v1/profiles?id=eq.${account.user.id}&select=*`, {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        audio_story_credits: nextCredits,
      },
    });
    const profile = updatedProfiles?.[0] || { ...account.profile, audio_story_credits: nextCredits };

    await supabaseServiceRequest("/rest/v1/redeem_code_redemptions", {
      method: "POST",
      body: {
        redeem_code_id: redeemCode.id,
        user_id: account.user.id,
        audio_story_credits: audioCreditsToAdd,
      },
    });

    await supabaseServiceRequest(`/rest/v1/redeem_codes?id=eq.${redeemCode.id}`, {
      method: "PATCH",
      body: {
        times_redeemed: Number(redeemCode.times_redeemed || 0) + 1,
      },
    });

    return response.status(200).json({
      ok: true,
      code,
      audioStoryCreditsAdded: audioCreditsToAdd,
      profile,
      message:
        audioCreditsToAdd === 1
          ? "Code redeemed. One free audio story has been added to your account."
          : `Code redeemed. ${audioCreditsToAdd} free audio stories have been added to your account.`,
    });
  } catch (error) {
    return sendApiError(response, error, "Could not redeem code");
  }
};
