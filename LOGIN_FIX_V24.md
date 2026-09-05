# Login Fix V24

- Google login uses popup first, with redirect fallback only when popup is blocked.
- Email login is driven by Firebase auth state; manual navigation race removed.
- Firestore role lookup cannot block authentication: 5-second timeout and background provisioning.
- Firestore profile/employee provisioning is best-effort and does not prevent dashboard access after successful authentication.
- Role is resolved before protected routes render.
