# WorkSphere Workflow Access v17

## Requests
- Employee: create, edit/cancel/delete own pending requests, view own requests.
- Manager/HR/Admin: view all requests, search/filter, approve or reject pending requests.
- Approval/rejection creates a personal notification for the requester.
- Firestore rules prevent employees from changing approval fields or approving their own requests.

## Attendance
- Employee: check in/out and view own history.
- Admin/HR/Manager: see workforce attendance with employee search/filter.
- Management history is enriched with employee name/code/department.

## Documents
- Employee: upload/view/delete own documents.
- Admin/HR/Manager: workforce document view/search/category/employee filter and management actions.
- Uploaded documents store owner name/email for management filtering.

## Departments and automatic filters
- Department options are merged from the department master list and employee records.
- Employee directory subscribes to both employees and departments in real time.
- Newly created departments appear in the filter automatically; newly added employees appear automatically.

## Announcements
- All roles can read announcements.
- Admin/HR/Manager can create/edit/delete and publish company-wide announcements.
- Employees can view published announcements and receive company-wide notification popups.
