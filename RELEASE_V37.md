# WorkSphere V37 — Payroll & PDF Reliability

## Fixes
- Salary-slip PDF branding image is now placed inside a dedicated bounded header box with aspect-ratio-preserving contain sizing.
- Prevents logo/branding image from overlapping the SALARY SLIP title.
- Falls back to the WorkSphere wordmark when no branding logo is available.
- Admin/HR payroll reports now calculate Net Salary from canonical payroll financial components for legacy records that lack a persisted `netSalary`.
- Monthly payroll report aggregation uses the same canonical calculation.
- Payroll report table normalizes legacy records before rendering.
- Existing payroll/PDF calculation remains non-negative and consistent with the salary-slip calculation.
- Release metadata synchronized to 1.0.37.

## Validation
- Required release files checked: PASS.
- package.json/package-lock/manifest/service-worker versions synchronized: PASS.
- JavaScript syntax (`node --check`) for src/scripts: PASS.
- Full dependency install/build could not be completed in the sandbox because `npm install --ignore-scripts --no-audit --no-fund` timed out.
