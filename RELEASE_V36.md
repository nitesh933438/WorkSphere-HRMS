# WorkSphere V36 — Payroll & Responsive UI Hardening

## Fixed
- Canonical payroll totals now derive from basic + allowances, attendance deduction, fixed deductions, and overtime instead of trusting stale historical `deductions`/`netSalary` fields.
- Salary-slip UI and downloaded PDF use the same canonical calculation.
- Legacy payroll records that contain a duplicated deductions total no longer render a negative net payable.
- Net payable is never negative; it is floored at Rs. 0.00.
- Attendance payroll does not manufacture absent days beyond actual working dates in a completed month.
- The configured monthly working-days value remains the salary divisor, while attendance counting is capped to real working dates.
- One-page PDF layout remains fixed to A4 safe margins with wrapped long employee IDs/emails/notes and contained signature/logo areas.
- Payroll history tables keep horizontal overflow inside the table container instead of breaking the page on small screens.
- Employee payroll history remains self-only through Firestore query/rule alignment.

## Validation
- `node --check` passed for payroll automation, payroll service, and salary-slip PDF utility.
- Full Vite production build could not be completed in the sandbox because the dependency installation timed out and the local `vite` binary was unavailable.
