# WorkSphere Notification System v10

Notifications are now workflow-driven instead of being limited to the notification page.

## Employee-facing events
- Payroll generated/updated/payment completed
- Leave submitted/updated/cancelled
- Request submitted/updated/cancelled
- Attendance check-in/check-out
- Document uploaded/updated/deleted

## Management-facing events
- Employee added/updated/deleted
- Employee auto-created after first Google login
- Attendance check-in/check-out
- Leave submitted/cancelled
- Request submitted/cancelled
- Document uploaded/updated/deleted
- Department created/updated/deleted
- Announcement changes

## Firestore
Deploy the included `firestore.rules` to Firebase Console > Firestore Database > Rules.
The rules add support for the `management` notification audience so HR/Manager/Admin can receive workflow events created by employees.

## Important
Notification failures are deliberately isolated from the main operation. A successful attendance, leave, payroll, document, or employee operation will not be rolled back just because notification creation fails.
