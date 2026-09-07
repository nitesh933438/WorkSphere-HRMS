# WorkSphere V29 — Authentication Bootstrap Fix

## Fixed
- Firebase Auth persistence is awaited before the auth-state listener is registered.
- Google redirect result is restored before the first route decision.
- Prevents a successful Google sign-in from racing `PublicRoute` and returning to `/login`.
- Keeps Firebase Auth as the single source of truth after redirect.
- Removed the local Vite COOP header that could interfere with Firebase auth-window handling.
- Service-worker cache version bumped to V1.0.29 so the localhost/deployed shell cannot keep the V28 shell cache.
