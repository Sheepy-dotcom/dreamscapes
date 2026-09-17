// First-party product analytics ingest.
//
// Signed-out visitors are the whole point of this - the question it exists to
// answer is how many free stories turn into accounts - so it takes no auth.
// That makes it a write endpoint anyone can call, so everything below is about
// keeping what lands in the table small, bounded and free of anything personal.

const { handleCorsPreflight, sendApiError, supabaseServiceRequest, ApiError } = require("./auth");

const MAX_EVENTS_PER_BATCH = 40;
const MAX_NAME_LENGTH = 64;
const MAX_DETAIL_KEYS = 8;
const MAX_DETAIL_VALUE_LENGTH = 120;
const MAX_VISIT_ID_LENGTH = 40;

// Event names are lowercase snake_case by convention throughout app.js.
// Anything else is a caller inventing names, and is dropped rather than stored.
const NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

function cleanVisitId(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, MAX_VISIT_ID_LENGTH);
}

// Only scalars, only a few, only short. A nested object or a long string is far
// more likely to be someone's story text than a useful dimension.
function cleanDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};

  const cleaned = {};
  for (const [key, value] of Object.entries(details)) {
    if (Object.keys(cleaned).length >= MAX_DETAIL_KEYS) break;
    if (!NAME_PATTERN.test(key) && !/^[a-z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;

    if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[key] = value;
    } else if (typeof value === "boolean") {
      cleaned[key] = value;
    } else if (typeof value === "string") {
      const trimmed = value.trim().slice(0, MAX_DETAIL_VALUE_LENGTH);
      if (trimmed) cleaned[key] = trimmed;
    }
  }
  return cleaned;
}

function buildRows(body) {
  const events = Array.isArray(body.events) ? body.events : [];
  if (!events.length) throw new ApiError(400, "No events supplied.");

  const visitId = cleanVisitId(body.visitId);

  return events
    .slice(0, MAX_EVENTS_PER_BATCH)
    .map((event) => {
      const name = String(event?.name || "").trim().slice(0, MAX_NAME_LENGTH);
      if (!NAME_PATTERN.test(name)) return null;
      return {
        name,
        details: cleanDetails(event?.details),
        visit_id: visitId || null,
      };
    })
    .filter(Boolean);
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const rows = buildRows(body);

    if (!rows.length) return response.status(202).json({ accepted: 0 });

    await supabaseServiceRequest("/rest/v1/analytics_events", {
      method: "POST",
      body: rows,
      prefer: "return=minimal",
    });

    return response.status(202).json({ accepted: rows.length });
  } catch (error) {
    // Analytics must never be the reason something the visitor is doing fails,
    // so a storage problem is logged and swallowed rather than surfaced.
    if (!(error instanceof ApiError)) {
      console.error(`[events] Could not store events: ${error.message}`);
      return response.status(202).json({ accepted: 0 });
    }
    return sendApiError(response, error, "Could not record events");
  }
};

module.exports.buildRows = buildRows;
