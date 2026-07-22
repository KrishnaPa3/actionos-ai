# Email & Password Update Fix - Progress Tracker

## Backend
- [x] Read and understand current implementation
- [x] **Fix `PATCH /profile/email`** — Replace `profiles` table write with Supabase Auth `update_user`
- [x] **Improve `PATCH /profile/password`** — Add specific Supabase error handling
- [x] **Verify no other backend files reference `profiles.email` or `profiles.password`**

## Frontend
- [x] Read and understand current implementation
- [x] **Update `ChangeEmailDialog.jsx`** — Change description to mention confirmation email
- [x] **Update `Profile.jsx`** — Verify email handler works with new response message

## Verification
- [x] Verify email updates no longer reference `public.profiles.email`
- [x] Verify password updates no longer reference `public.profiles.password`
- [x] Verify email changes use `auth.users` via Supabase Auth
- [x] Verify password changes use `auth.users` via Supabase Auth
- [x] Verify existing profile functionality continues to work

