# WorkSphere V32 — Status + Attendance Permission Stabilization

## Fixes

- User Management no longer hard-codes every Firebase account as `Active`.
- Employee employment status is read from the `employees` collection and displayed in User Management.
- Inactive employees are blocked from starting a new attendance session.
- Attendance reopen remains Admin/HR only and requires a reason.
- A successful attendance reopen is not reported as failed if the optional audit write is temporarily unavailable.
- Check-in/check-out service no longer writes duplicate console errors; the UI receives the real Firebase error.
- PWA/cache version bumped to 1.0.32.

## Critical Firebase step

The project includes `firestore.rules`. The local rules file does not automatically change the rules already deployed in Firebase Console.

Before testing attendance corrections, publish the included rules to the same Firebase project:

```bash
firebase deploy --only firestore:rules
```

or paste the complete `firestore.rules` into Firebase Console → Firestore Database → Rules → Publish.

If the console still reports `Missing or insufficient permissions` after this, the app is connected to a different Firebase project than the one where the rules were published. Verify the `VITE_FIREBASE_PROJECT_ID` value.
