# WorkSphere V31 — Final System Stabilization

## Authentication
- Google sign-in uses Firebase popup as the primary flow.
- Redirect is used only when the popup is explicitly blocked.
- Local development no longer calls `getRedirectResult()` during normal popup sessions.
- Auth bootstrap waits for Firebase persistence before route decisions.

## Attendance
- Admin/HR can reopen a completed attendance record after an accidental checkout.
- Reopen requires a reason of at least 5 characters.
- Original check-in is preserved; only checkout is cleared.
- Every reopen is recorded in `attendanceAudit` with actor, reason and previous values.
- Employee receives a notification after a successful reopen.
- Managers cannot reopen attendance.

## Payroll
- Current-month future working days are never treated as absent.
- Attendance summary continues to show elapsed working days.
- Salary daily rate uses the configured monthly payroll divisor (default 26), not elapsed days.
- Attendance deduction, fixed deductions and overtime use one calculation path.

## Salary Slip PDF
- PDF generation now assembles binary image bytes safely.
- Embedded company logos/signatures no longer corrupt PDF cross-reference offsets.
- Downloaded PDF remains separate from browser Print.
- One-page A4 layout and signature safe area are preserved.

## Firestore
- Added secure `attendanceAudit` rules.
- Attendance correction remains restricted to Admin/HR.
