/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    CF_ACCESS_TEAM_DOMAIN: string;
    CF_ACCESS_AUD: string;
    ADMIN_ALLOWED_EMAILS: string;
    ADMIN_ROLE_MAPPINGS: string;
    PUBLIC_SITE_URL?: string;
    TURNSTILE_SECRET_KEY?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    RESEND_API_KEY?: string;
    QUOTE_FROM_EMAIL?: string;
    QUOTE_TO_EMAIL?: string;
  }
}

export {};
