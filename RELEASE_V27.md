# WorkSphere V27 — Login + Payroll Stability

## Fixes
- Google authentication uses Firebase redirect only; no `signInWithPopup` remains in the source.
- Configured administrator is resolved before Firestore role lookup, so a Firestore permission/network error cannot downgrade the admin to employee.
- Firestore administrator rule accepts the configured admin email regardless of whether the Firebase account signed in with Google or Email/Password.
- Employee salary lookup now supports document ID, employee code, employee ID, user UID and email so legacy/current salary records are found reliably.
- Generating payroll now persists/updates the employee salary structure, so future payroll months load salary components automatically.
- Missing salary structure is an informational first-time message rather than a blocking error.
- Attendance-linked payroll remains automatic and future dates in the current month are not counted as absent.
- Payroll access remains restricted to Admin/HR; Manager is not granted payroll access.

## Important deployment step
Publish `firestore.rules` to the same Firebase project used by the application, then rebuild/redeploy the V27 frontend so the new authentication source is served instead of an older cached build.
