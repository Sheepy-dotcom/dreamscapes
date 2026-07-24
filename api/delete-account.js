const {
  getAccountContext,
  handleCorsPreflight,
  sendApiError,
  supabaseServiceRequest,
} = require("./auth");

const AUDIO_BUCKET = "story-audio";

function uniqueAudioPaths(stories = []) {
  return [
    ...new Set(
      stories.flatMap((story) => (Array.isArray(story.audio_paths) ? story.audio_paths : [])).filter(Boolean)
    ),
  ];
}

async function removeAudioObjects(paths) {
  if (!paths.length) return;

  try {
    await supabaseServiceRequest(`/storage/v1/object/${AUDIO_BUCKET}`, {
      method: "DELETE",
      body: { prefixes: paths },
    });
  } catch (error) {
    console.warn("Account deletion could not remove every audio object", error);
  }
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "DELETE, POST, OPTIONS")) return;

  if (!["DELETE", "POST"].includes(request.method)) {
    response.setHeader("Allow", "DELETE, POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const account = await getAccountContext(request);
    const userId = account.user.id;
    const stories = await supabaseServiceRequest(
      `/rest/v1/stories?user_id=eq.${userId}&select=audio_paths`
    );

    await removeAudioObjects(uniqueAudioPaths(stories));
    await supabaseServiceRequest(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
    });

    return response.status(200).json({
      ok: true,
      message: "Your DreamScapes account has been deleted.",
    });
  } catch (error) {
    return sendApiError(response, error, "Could not delete account");
  }
};
