# WorkSphere v1.0.14

## Included fixes

- Role-wise real-time notifications with personal read state (`readBy`) for company/management broadcasts.
- Employee accounts never subscribe to management-only notifications.
- Company and management notifications can be marked read independently by each recipient.
- Fixed DashboardLayout JSX syntax issue.
- Fixed attendance checkout notification path by resolving the current user before using user.email.
- Fixed Leave page refresh so management users reload all leave records instead of their own records.
- Added notifications for leave deletion.
- Salary-slip PDF filename includes employee name, employee ID, `Done`, and pay period.
- Footer version is injected from `package.json` automatically at build time.
- PWA manifest and service-worker cache version are synchronized automatically before every build.
- PWA install dismissal is version-specific so a new release can show the install prompt again.
- Lightweight static-asset PWA caching; Firebase/API/live data stays network-backed.

## Leave workflow

- Employee: submit, edit/cancel pending requests and view own status.
- Manager: approve/reject pending requests.
- HR: approve/reject pending requests.
- Admin: approve/reject and manage all requests.

## Build

```bash
npm install
npm run build
npm run dev
```

The `prebuild` script runs `scripts/sync-version.mjs` and updates the PWA manifest and service-worker cache identifier from `package.json`.

## Firestore rules

Deploy the included `firestore.rules` in Firebase Console > Firestore Database > Rules, or with Firebase CLI. The notification rules allow users to mark only their own read state on company-wide notifications, while management users can mark their own read state on management notifications.
