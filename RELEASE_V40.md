# WorkSphere V40 — Canonical Payroll Financials

- Fixed management payroll/history/report views showing ₹0 when legacy payroll documents contain a stale or missing `netSalary` field.
- Payroll financials are now normalized consistently at the service boundary for all payroll retrieval paths.
- Canonical calculation: Gross Salary + Overtime - Attendance Deduction - Fixed Deductions, never below zero.
- Legacy records with only a persisted net value retain that value when no financial components exist.
- Management payroll filters, totals, employee payroll, salary slip, history and reports now consume the same normalized amount.
- Release audit passed for v1.0.40.

## V40 Hotfix — Payroll History syntax

- Fixed the `PayrollHistory.jsx` filtered-total `reduce()` expression that caused Vite/Rolldown dependency scanning to fail with `Expected \, or ) but found }`.
- The filtered payroll total now correctly sums `normalizePayrollFinancials(record).netSalary` with an initial value of `0`.
