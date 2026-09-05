# Attendance / Firestore Fix

## What was fixed

- Added `firestore.rules` to the repository so the deployed Firebase rules are versioned with the project.
- Employee attendance reads now check the deterministic daily document first:
  `attendance/{firebaseUid}_{YYYY-MM-DD}`.
- The existing query remains as a backward-compatible fallback for older attendance documents.
- Employee check-in remains restricted to the authenticated user's UID/email.
- Employee check-out remains restricted to the employee's own open record.
- Admin and HR retain attendance management access.
- Manager retains attendance read access.

## Deployment

1. Firebase Console → Firestore Database → Rules.
2. Paste the repository's `firestore.rules`.
3. Click **Publish**.
4. Commit and push the project to `main`.
5. GitHub Actions builds and deploys GitHub Pages.
6. Log out/in once on the live site and test Employee → Attendance → Check In.

Do not use `allow read, write: if true`; attendance and payroll data must remain protected.
