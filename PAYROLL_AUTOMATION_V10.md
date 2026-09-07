# WorkSphere Payroll Automation v10

## Fixed
- Salary Slip now downloads as a real one-page A4 PDF directly from the browser. It does not depend on the browser print dialog and avoids blank/white PDF output.
- PDF includes employee details, employee code, payroll period, payment status/date/method, earnings, deductions, gross salary, net payable, transaction ID and notes.
- PDF filename is generated automatically from employee code and payroll period.
- Payroll creation automatically sends the employee a notification with a direct salary-slip link.
- Payroll payment/status updates automatically notify the employee when the payment is completed or the payroll record changes.
- Salary detail changes notify the employee.
- Attendance check-in, leave submission, request submission and document creation generate personal notifications.
- Notification failures never cancel the underlying successful business operation.

## Notes
- The PDF generator is dependency-free and uses a compact A4 vector layout so it remains one page.
- Non-ASCII characters that cannot be represented by the built-in PDF Helvetica font are safely replaced rather than corrupting the PDF.
