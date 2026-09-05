# WorkSphere v25 Final Fix Checklist

## Firestore rules
1. Firebase Console -> Firestore Database -> Rules.
2. Replace the live rules with `firestore.rules` from this release.
3. Click Publish.
4. Hard refresh the app after publishing.

The rules keep payroll restricted to Admin/HR plus the employee's own payroll record. Management notifications are readable by Admin/HR/Manager.

## Reports
The reports overview no longer fetches payroll data for Manager accounts, preventing a permission-denied query and preventing payroll totals from being exposed to managers.

## Salary PDF
The salary slip reserves a dedicated signature/footer zone, scales the signature proportionally, wraps long fields, and moves unusually long notes to an additional A4 page instead of allowing content to overlap the signature.

## Google sign-in
`Cross-Origin-Opener-Policy` messages from Firebase popup polling are browser/auth-provider warnings and are separate from Firestore permission rules.
