# WorkSphere v1.0.23 — Role & Permission Matrix

## Administrator
- Full user/role management.
- Add, edit and remove employees.
- Manage departments and company settings.
- Manage payroll and payroll reports.
- View workforce, attendance and leave reports.
- Manage announcements and management notifications.
- Can access all company records permitted by Firestore rules.

## HR
- Add, edit and remove employees.
- Manage departments and company settings.
- Manage payroll, salary records and payroll reports.
- View workforce, attendance and leave reports.
- Manage announcements and HR workflows.
- Cannot change user roles unless the account is Administrator.

## Manager
- View workforce/employee directory.
- View attendance, leave and workforce reports.
- Review requests and management workflows exposed by the application.
- View departments, but department records are read-only.
- Receive management notifications.
- No payroll management or payroll report access.
- No user-role management.
- No employee create/edit/delete controls.

## Employee
- Access personal dashboard, attendance, leave, requests, documents, announcements and notifications.
- View own salary slip/payroll data only.
- Profile editing is limited to phone and address/contact fields: phone, address, city, state, country and pincode.
- Official company-controlled fields are read-only: name, email, employee code, department, designation and joining date.
- Cannot change role, salary, payroll, department, designation, employee code or employment status.
- Cannot create employee records or manage departments/users.

## Security rules
- Firestore rules enforce the same role boundaries as the UI.
- Employee profile updates are restricted to personal contact/address fields.
- Employee records are created by Admin/HR only; an employee login may only claim a pre-created record matching the authenticated email.
- Payroll and salary collections are restricted to Admin/HR plus the individual employee's own record.
- Google sign-in uses redirect flow to avoid popup polling / COOP warnings.
