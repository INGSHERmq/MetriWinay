import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = [".env.local", ".env"].map((file) => path.join(root, file)).find(fs.existsSync);

if (!envPath) {
  console.error("Missing .env.local or .env in project root.");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    })
);

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOKEN_ENCRYPTION_KEY_BASE64",
  "META_CLIENT_ID",
  "META_CLIENT_SECRET",
  "META_REDIRECT_URI"
];

let ok = true;

for (const key of required) {
  if (!env[key]) {
    console.error(`Missing ${key}`);
    ok = false;
  }
}

if (env.TOKEN_ENCRYPTION_KEY_BASE64) {
  const bytes = Buffer.from(env.TOKEN_ENCRYPTION_KEY_BASE64, "base64");
  if (bytes.length !== 32) {
    console.error("TOKEN_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
    ok = false;
  }
}

if (env.SUPABASE_SERVICE_ROLE_KEY) {
  const [, payload] = env.SUPABASE_SERVICE_ROLE_KEY.split(".");
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.role !== "service_role") {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not a service_role JWT.");
      ok = false;
    }
  } catch {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not a valid JWT.");
    ok = false;
  }
}

if (env.META_REDIRECT_URI && !env.META_REDIRECT_URI.endsWith("/api/oauth/meta/callback")) {
  console.error("META_REDIRECT_URI must end with /api/oauth/meta/callback.");
  ok = false;
}

if (
  env.META_OAUTH_SCOPE_MODE &&
  !["basic", "publishing"].includes(env.META_OAUTH_SCOPE_MODE)
) {
  console.error("META_OAUTH_SCOPE_MODE must be basic or publishing.");
  ok = false;
}

if (!ok) process.exit(1);

console.log(`Environment looks ready: ${path.basename(envPath)}`);
