# Profile & Authentication

## ✅ Completed

- **Change Password** — Works via Supabase Auth (reauthenticate with `signInWithPassword`, then `updateUser({ password })`). No backend endpoint used.
- **Change Email** — ❌ **Removed entirely.** The feature was causing 429 rate-limit errors from Supabase due to the email verification flow complexity. The "Change Email" button, dialog, and all related code have been deleted as if it never existed.
- **AuthCallback** — Reverted to simple signup-only flow: `getSession()` → `signOut()` → redirect to `/login?verified=true`.
- **Backend** — `backend/routers/profile.py` manages only application data (username, full_name, profile info, account deletion). No email/password endpoints.
- **Authentication** — All auth operations handled through Supabase Auth on the frontend.

