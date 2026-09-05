# WorkSphere v1.0.33 — Manager & Auth Stabilization

## Fixed
- Google authentication now uses Firebase redirect flow as the primary flow in localhost and production. This removes popup `window.closed` / COOP polling warnings.
- AuthContext completes redirect result after Firebase persistence is ready.
- Management users (Admin/HR/Manager) can record their own attendance without requiring a matching `employees` directory record.
- Employee inactive-status blocking remains enforced for employee accounts.
- Manager attendance access remains read/review only for workforce records; only Admin/HR can reopen attendance.
- Existing Firestore role boundaries remain enforced.

## Important deployment step
The included `firestore.rules` must be published to the Firebase project before testing permissions:

```bash
firebase deploy --only firestore:rules
```

A local rules file does not change the rules already deployed in Firebase.
