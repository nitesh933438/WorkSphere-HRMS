# WorkSphere v1.0.34 — Login Recovery Fix

## Authentication fixes
- Google login uses Firebase `signInWithPopup` as the primary localhost flow.
- Popup-blocked browsers fall back to `signInWithRedirect`.
- Successful email and Google authentication navigate directly to `#/dashboard` only after Firebase returns a successful credential.
- Auth context now uses `auth.currentUser` as a short-lived fallback while React auth state catches up, preventing a successful login from being bounced back to `#/login`.
- Removed `getRedirectResult()` from the normal auth bootstrap to prevent redirect-result races.
- Firebase local persistence remains enabled.

## Important
The browser console may still show a `Cross-Origin-Opener-Policy` `window.closed/window.close` warning during Google popup authentication. That warning is produced by the browser/Firebase popup lifecycle and is not treated as a login failure.

## Localhost test
1. Stop Vite.
2. Replace the project with this release.
3. Delete `dist` and Vite cache if present (`node_modules/.vite`).
4. Run `npm install` if dependencies are not installed.
5. Run `npm run dev`.
6. Test Google login and email/password login.
