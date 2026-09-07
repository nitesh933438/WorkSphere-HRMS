# WorkSphere V35 — Payroll & Salary Slip Hardening

- Employee payroll history is available at `/payroll/history`.
- Employees see every payroll slip belonging to their own Firebase UID, with a safe legacy email fallback.
- Employees cannot read another employee’s payroll data.
- Employee history opens private salary slips; Admin/HR retain payroll editing.
- Manager remains excluded from payroll management/history.
- Payroll generation blocks duplicate employee/month/year payroll records.
- Attendance-linked payroll calculation remains automatic under the configured company payroll policy.
- Salary structure remains management-controlled.
