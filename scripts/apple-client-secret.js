#!/usr/bin/env node
/**
 * Generates the "Secret Key (for OAuth)" that Supabase's Apple provider asks for.
 *
 * Apple does not use the .p8 file itself as the secret. The secret is a short
 * lived JWT signed with that file, carrying the Team ID, Key ID and Services ID
 * inside it - which is why there is nowhere in Supabase to type those, and why
 * the secret expires and has to be regenerated every six months.
 *
 * The private key is read from disk and never leaves this machine.
 *
 *   node scripts/apple-client-secret.js \
 *     --key ~/Downloads/AuthKey_ABCD1234.p8 \
 *     --team JX5LYD6MZ2 \
 *     --kid ABCD1234 \
 *     --services cloud.dreamscapes.web
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Apple refuses anything longer than six months.
const SIX_MONTHS_IN_SECONDS = 15777000;

function readArguments(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = String(argv[i] || "").replace(/^--/, "");
    if (name) args[name] = argv[i + 1];
  }
  return args;
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function main() {
  const args = readArguments(process.argv.slice(2));
  const missing = ["key", "team", "kid", "services"].filter((name) => !args[name]);

  if (missing.length) {
    console.error(`Missing: ${missing.map((name) => `--${name}`).join(", ")}\n`);
    console.error("  --key       path to the AuthKey_XXXXXXXX.p8 file downloaded from Apple");
    console.error("  --team      your Apple Team ID, e.g. JX5LYD6MZ2");
    console.error("  --kid       the Key ID shown beside that key in the developer portal");
    console.error("  --services  the Services ID, e.g. cloud.dreamscapes.web");
    process.exit(1);
  }

  const keyPath = args.key.replace(/^~(?=$|\/)/, process.env.HOME || "~");
  if (!fs.existsSync(keyPath)) {
    console.error(`Could not find the key file at ${path.resolve(keyPath)}`);
    process.exit(1);
  }

  const privateKey = fs.readFileSync(keyPath, "utf8");
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    console.error("That file does not look like an Apple .p8 private key.");
    process.exit(1);
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SIX_MONTHS_IN_SECONDS;

  const header = base64url(JSON.stringify({ alg: "ES256", kid: args.kid }));
  const payload = base64url(
    JSON.stringify({
      iss: args.team,
      iat: issuedAt,
      exp: expiresAt,
      aud: "https://appleid.apple.com",
      sub: args.services,
    })
  );

  // ES256 signatures must be the raw r||s pair, not the DER encoding Node
  // produces by default.
  const signature = crypto
    .sign("sha256", Buffer.from(`${header}.${payload}`), { key: privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log(`${header}.${payload}.${signature}`);
  console.error(`\nPaste the line above into Supabase as the Apple "Secret Key (for OAuth)".`);
  console.error(`It stops working on ${new Date(expiresAt * 1000).toDateString()}, when you run this again.`);
}

main();
