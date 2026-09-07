# WorkSphere role-wise setup

This build makes the real rendered sidebar (`src/layouts/DashboardLayout.jsx`) role-aware.

## Roles

- `admin` — only Google login for `nitesh933438@gmail.com`
- `hr` — HR operations
- `manager` — team operations
- `employee` — personal workspace

## Important

1. Deploy `firestore.rules` in Firebase Console → Firestore Database → Rules, or use Firebase CLI.
2. Ensure Google sign-in is enabled in Firebase Authentication.
3. Copy `.env.example` to `.env` and keep your Firebase variables there.
4. Run:
   - `npm install`
   - `npm run dev`
5. Test each role with separate Google accounts.
6. `User Management` is now shown only for the Admin account.

## Why User Management was missing

The application was rendering the navigation from `src/layouts/DashboardLayout.jsx`, not from the older `src/components/layout/Sidebar.jsx`. The old Sidebar had the User Management item, but it was not the active sidebar. The fixed build puts the role-aware navigation in the actual DashboardLayout.
