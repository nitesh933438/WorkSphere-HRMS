# WorkSphere V38 — Premium Salary Slip PDF Branding Fix

## Salary Slip PDF
- Restored company name text in the PDF header even when a company logo is configured.
- Kept the employee name, employee ID, email, department, designation and employment status visible.
- Added a cleaner premium A4 header with separate logo, company identity and salary-slip title areas.
- Preserved logo aspect ratio with automatic containment.
- Preserved signature placement inside a dedicated footer area.
- Kept the salary slip as a single-page A4 PDF.
- Preserved payroll financial values and attendance-linked calculations.
- PDF filename now includes the configured company name and employee identity.

## Validation
- `node --check src/utils/salarySlipPdf.js` passed.
- Release audit passed for v1.0.38.
- Production dependency installation could not complete in the validation environment because `npm ci` timed out; therefore a full Vite production build was not claimed as verified here.
