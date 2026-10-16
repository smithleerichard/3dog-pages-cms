# Deploy this fork on Vercel

This fork is the Pages CMS install for `https://cms.3dogmedia.co.uk`.
Set the variables below on the Vercel project. Names are the ones in `.env.local.example`.

Generate `BETTER_AUTH_SECRET` and `CRYPTO_KEY` with `openssl rand -base64 32`.
`GITHUB_APP_PRIVATE_KEY` is the full PEM, including the begin and end lines.

## Required

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for this project |
| `BETTER_AUTH_SECRET` | Random secret |
| `CRYPTO_KEY` | Random secret, distinct from `BETTER_AUTH_SECRET` |
| `BASE_URL` | `https://cms.3dogmedia.co.uk` |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | Verified Resend sender, for example `Pages CMS <no-reply@mail.pagescms.org>` |
| `RESEND_API_KEY` | Resend API key |
| `GITHUB_APP_ID` | GitHub App id |
| `GITHUB_APP_NAME` | GitHub App machine name (URL slug) |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (PEM) |
| `GITHUB_APP_WEBHOOK_SECRET` | GitHub App webhook secret |
| `GITHUB_APP_CLIENT_ID` | GitHub App client id |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret |

`BASE_URL` is the single canonical app URL. The GitHub App user-authorization callback is `https://cms.3dogmedia.co.uk/api/auth/callback/github` and the webhook is `https://cms.3dogmedia.co.uk/api/webhook/github`.

`EMAIL_PROVIDER`, `RESEND_API_KEY`, and `BASE_URL` are commented in `.env.local.example` and must be set for this deploy. SMTP variables stay unset.

## Optional

These are in `.env.local.example` and can stay unset:

- `ADMIN_EMAILS`
- `RESEND_FROM_EMAIL` (alias for `EMAIL_FROM`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- `CACHE_CHECK_MIN`, `CONFIG_CHECK_MIN`, `FILE_TTL_MIN`, `PERMISSIONS_TTL_MIN`, `BRANCH_HEAD_TTL_MS`, `REPO_META_TTL_MS`
- `WEBHOOK_PUSH_INCREMENTAL_MAX_FILES`, `WEBHOOK_PUSH_SCOPED_INVALIDATION_MAX_FILES`
