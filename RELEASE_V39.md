# WorkSphere V39 — Salary Slip Download Naming

## Fixed
- Salary slip PDF downloads now use a predictable professional filename:
  `Salary-Slip_<EmployeeName>_<EmployeeID>_<Month-Year>.pdf`
- Company name remains in the PDF header and is not removed from the document when naming the downloaded file.
- Filename parts are sanitized for safe cross-platform downloads.
- Existing premium PDF branding, employee details, payroll calculations, signature, and one-page A4 layout are retained.

## Validation
- Release audit passed for v1.0.39.
- Production build could not be completed in this environment because the Vite dependency was unavailable locally and `npm ci` timed out.
