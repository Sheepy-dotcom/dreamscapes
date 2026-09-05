// Short link for profiles and link-in-bio: https://www.dreamscapes.cloud/app
//
// Sends iPhone/iPad visitors to the App Store, Android visitors to Google Play,
// and everyone else to the website. An optional ?s= tags the visit so each
// profile can be told apart in App Store Connect and Play Console, e.g.
// /app?s=instagram.

const APP_STORE_ID = "6784545562";
const PLAY_PACKAGE = "cloud.dreamscapes.app";
const WEBSITE = "https://www.dreamscapes.cloud/";

const APPLE_PROVIDER_TOKEN = process.env.APPLE_PROVIDER_TOKEN || "";

function sanitiseSource(value) {
  // Only ever echo a short, boring token back into an outbound URL.
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function appStoreUrl(source) {
  const url = new URL(`https://apps.apple.com/app/id${APP_STORE_ID}`);
  url.searchParams.set("mt", "8");
  if (source) {
    url.searchParams.set("ct", source);
    if (APPLE_PROVIDER_TOKEN) url.searchParams.set("pt", APPLE_PROVIDER_TOKEN);
  }
  return url.toString();
}

function playStoreUrl(source) {
  const url = new URL("https://play.google.com/store/apps/details");
  url.searchParams.set("id", PLAY_PACKAGE);
  if (source) {
    url.searchParams.set("referrer", `utm_source=${source}&utm_medium=profile`);
  }
  return url.toString();
}

function websiteUrl(source) {
  if (!source) return WEBSITE;
  const url = new URL(WEBSITE);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "profile");
  return url.toString();
}

function resolvePlatform(userAgent) {
  const ua = String(userAgent || "");
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "web";
}

function resolveTarget(userAgent, rawSource) {
  const source = sanitiseSource(rawSource);

  switch (resolvePlatform(userAgent)) {
    case "android":
      return playStoreUrl(source);
    case "ios":
      return appStoreUrl(source);
    default:
      return websiteUrl(source);
  }
}

module.exports = (req, res) => {
  const query = req.query || {};
  const target = resolveTarget(req.headers["user-agent"], query.s || query.source);

  // The destination depends on the visitor, so it must never be cached by a
  // shared proxy, and 302 keeps it changeable if a store URL ever moves.
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "User-Agent");
  res.setHeader("Location", target);
  res.status(302).end();
};

module.exports.resolveTarget = resolveTarget;
