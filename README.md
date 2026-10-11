# Upseller

A responsive personal upsell tracker for Fairmont The Palm. Built with Next.js App Router, React, TypeScript, and MongoDB Atlas.

## Run locally

1. Install Node.js 22.9 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to your Atlas connection string. Set `MONGODB_DB` if desired.
3. In Atlas, create a database user with read/write access to the application database and allow the application server's IP in Network Access. URL-encode special characters in the database password.
4. Run `npm run dev` and open http://localhost:3000.

Without a database, choose **Explore the demo**. Demo records are fictional, changes stay in memory, and refresh resets them. Real accounts never use demo storage.

## Features

- Email-first registration and sign-in, first and last name, bcrypt password hashes, unique normalized email index.
- Roles: `user` (default for self-registration and legacy records without a role) and `admin`. Admins get a responsive User management screen to add, edit, and soft-delete accounts. New accounts choose their password at first sign-in. Roles are enforced by the server on every management request.
- Soft-deleted accounts retain their email and sales history, cannot sign in or register again, and cannot use existing sessions. Deletion records `deletedAt` and `deletedBy`; the management screen can show deleted accounts. Admins cannot delete or demote themselves. Editing an account keeps its password and sales ownership intact.
- Server-side opaque sessions stored as hashes in MongoDB; HttpOnly, SameSite cookies, Secure in production. Remember me defaults to checked (365 days); unchecked uses a browser session cookie with a 24-hour server lifetime. Logout revokes the session. Expired sessions are removed using a TTL index.
- Every sale belongs to the authenticated user. Reads, edits, and deletes enforce ownership on the server. Mutations check the request origin. Email-based authentication throttling uses MongoDB with a 15-minute window.
- Breakfast, half board, room upsell, and suite upsell packages; guest, confirmation, room, nightly AED upsell value, nights, editable sale timestamp, Opera status and updater, notes, creation and edit timestamps.
- Daily, monthly, yearly, and all-time reporting; date navigation, revenue chart, package mix, expandable records, search, filters, editing, deletion confirmation, CSV export.
- Compact sidebar inspiration focuses on self-worth, happiness, and personal growth. It rotates every 15 minutes and can be refreshed on demand. Subtle previous/next icons browse the last 20 quotes, with no repeats within that history. The profile and logout stay visible without sidebar scrolling. Original messages and per-user history are stored locally in the browser; rotation catches up when a sleeping tab is opened again. Manual refresh restarts the 15-minute timer. History still works for the current session if browser storage is unavailable.
- Dubai time (Asia/Dubai) is used consistently for reporting, displayed dates, and form entry. `amount` is the upsell value per night. Total revenue is `amount × nights`, calculated in whole fils: AED 100 for 5 nights earns AED 500. This total drives every dashboard, chart, package breakdown, sale row, and CSV report. The form previews the total before saving. The API computes the total on every read and stores `totalRevenue` on creation/edit, ignoring any caller-supplied total. Existing records use their saved `amount` as the nightly value without changing the saved input; totals are recalculated when read, and editing saves the derived total. No guest count, tax, or commission is assumed.

## Verification and deployment

### Seed the administrator

Run `npm run seed:admin` after configuring `.env.local`. This idempotently creates or promotes **Navan Sami** (`navan.sami@fairmont.com`) to `admin`, activates the account, and gives legacy accounts without a role the `user` role. It preserves any existing password and sale records. If there is no password, Navan enters the email on the sign-in screen, confirms the prefilled name, and chooses a password. No default password is stored. Re-running the seed explicitly reactivates this administrator if soft-deleted.

Run `npm run typecheck`, `npm test`, and `npm run build`. Browser tests use an installed Google Chrome; adjust `channel` in `playwright.config.ts` if needed. Deploy to a Node.js-compatible Next.js host, set the same environment variables, and configure Atlas network access for that host. No secrets are required in the browser. The application requires HTTPS in production. Configure a reverse proxy to preserve the external Host header, or set `APP_ORIGIN` to the canonical public origin for the mutation origin check.

After building, `npm run test:integration` verifies admin authorization, role changes, first-password setup, duplicate emails, soft deletion, session revocation, and retained sale history against a uniquely named temporary Atlas database. It starts an isolated production server on port 3101 and removes only that temporary database afterward. The Atlas database user needs permission to create and drop a test database. It never changes the configured application database or Navan’s password.

Accounts are self-service: an email address without a password can create an account. Email verification and password recovery are not implemented; ownership of an email address is not verified by this flow. Pre-provisioned passwordless users are treated as open registrations. For a restricted staff deployment, add an invitation/verified-email flow before allowing registration. Existing password hashes cannot be replaced through registration. The application tracks Opera updates manually; it does not connect to Opera PMS.

Google Fonts are loaded from Google's stylesheet service; system sans-serif fonts are the fallback. Monetary totals use two decimal places; there is no configured revenue target or commission model.
