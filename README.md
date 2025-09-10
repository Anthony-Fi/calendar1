This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# How to use this Calendar app (Admins & Moderators)

## Quick start (local dev)

- NEXTAUTH env: set in `web/.env`
  - `NEXTAUTH_URL="http://localhost:3000"`
  - `NEXTAUTH_SECRET="dev-secret-change-me"` (use a random secret in production)
- Optional: Email and Turnstile CAPTCHA (leave unset for simple manual testing)
  - `EMAIL_SERVER` / `EMAIL_FROM` for passwordless magic-link emails
  - `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` for CAPTCHA on public forms
- Run from `web/`:
  - `npx prisma migrate dev`
  - `npx prisma generate`
  - `npm run dev`

## Roles

- Admin
  - Full event management, feature/unfeature, soft delete/restore
  - User management, CSV/email export, copy emails
  - Generate passwords for users (manual email flow)
  - Approve or deny access requests
- Moderator
  - Update event statuses (DRAFT/SCHEDULED; additional transitions may be allowed)
  - Approve or deny access requests (to share workload)
- User
  - Sign in and create events (if enabled) or use public features

## Public features

- Month/List/Week/Day views exclude drafts and soft-deleted events
- Event detail page 404s for drafts or soft-deleted events

## Event soft-delete

- Events use `deletedAt` to hide from public views
- Admin · Events: `/{locale}/admin/events`
  - Per-row delete/restore; bulk delete/restore
  - “Trash” filter to show deleted items
  - Audit trail records admin actions

## Users and email tools (Admin)

- Admin · Users: `/{locale}/admin/users`
  - Filters: role, verified, opt-in, keyword
  - Copy emails: visible / selected / all (across pages, deduped, sorted)
  - Download CSV for current filters
  - Opt-in column + per-user toggle (writes audit)
  - Generate password button shows a one-time password (hash is stored; plaintext is not)

### Passwordless login (optional)

- Configure email to enable magic links:
  - `EMAIL_SERVER="smtp://USER:PASS@HOST:PORT"`
  - `EMAIL_FROM="Your App <no-reply@example.com>"`
- Then use “Passwordless login” on `/{locale}/login`

## Request Access workflow

- Public Request Access form on `/{locale}/login` collects:
  - Name, Group, Location, Email, Consent for email updates
  - Optional Turnstile CAPTCHA if keys are set
- Review queue for Admins/Moderators: `/{locale}/admin/users/requests`
  - Filter Open/All and search
  - Approve: creates user (if missing), applies opt-in when consented, marks processed, writes audit
  - Deny: marks processed

## Environment variables (summary)

- Required
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
- Optional
  - `EMAIL_SERVER`, `EMAIL_FROM` for magic links
  - `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` for CAPTCHA

## Security notes

- Never store or resend plaintext passwords; use the Generate Password tool only for a one-time copy and encourage users to change it after login
- Prefer passwordless login (or SSO) and enable CAPTCHA for public forms in production
- Always use HTTPS and a strong `NEXTAUTH_SECRET` in production
