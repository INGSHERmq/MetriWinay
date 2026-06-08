import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default(() => {
    if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  }),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  TOKEN_ENCRYPTION_KEY_BASE64: z.string().optional(),
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default("v25.0"),
  META_OAUTH_SCOPE_MODE: z.enum(["basic", "publishing"]).default("basic"),
  META_REDIRECT_URI: z.string().url().optional(),
  CRON_SECRET: z.string().optional()
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TOKEN_ENCRYPTION_KEY_BASE64: process.env.TOKEN_ENCRYPTION_KEY_BASE64,
  META_CLIENT_ID: process.env.META_CLIENT_ID,
  META_CLIENT_SECRET: process.env.META_CLIENT_SECRET,
  META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
  META_OAUTH_SCOPE_MODE: process.env.META_OAUTH_SCOPE_MODE,
  META_REDIRECT_URI: process.env.META_REDIRECT_URI,
  CRON_SECRET: process.env.CRON_SECRET
});
