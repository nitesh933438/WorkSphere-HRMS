# WorkSphere Notification System v13

## Role-wise visibility
- Employee: personal + company-wide notifications only.
- Admin/HR/Manager: personal + company-wide + management workflow notifications.
- Employees never subscribe to the `management` audience, preventing permission errors and management-only visibility.

## Real-time popup
DashboardLayout subscribes to Firestore in real time. New notifications created after the initial snapshot appear as a premium top-right popup and update the unread badge.

## Workflow coverage
Employee, leave, request, attendance, document, department and announcement services already emit workflow notifications. Payroll v13 additionally emits notifications for salary create/update/delete and payroll create/update/delete, including employee-facing and management-facing events.

## Salary slip filename
Downloads use:
`WorkSphere-Salary-Slip-{EmployeeName}-{EmployeeID}-Done-{Period}.pdf`

## Firestore
Keep the v12 Firestore rules with the `management` audience read/create clauses. The frontend now avoids querying that audience for employees, while Firestore rules remain the security boundary.
