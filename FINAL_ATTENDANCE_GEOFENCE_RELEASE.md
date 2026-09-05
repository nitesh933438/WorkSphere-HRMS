# WorkSphere-HRMS Final Attendance/GPS Release

- Added company-configurable attendance policy in Settings.
- Added office hours, late-after time, working days, office coordinates, radius, and location-required controls.
- Added GPS/geofence validation to normal Check In.
- Added automatic Late status.
- Added manual attendance request flow for GPS/location problems; only Admin/HR can approve attendance requests.
- Added PWA install banner at the top level so it can appear before/after login when the browser exposes the native install prompt.
- Bumped application/PWA cache version to 1.0.41 to avoid stale cached assets after deployment.

## Important

Before enabling location-required attendance, Admin/HR must enter the company office latitude and longitude in Settings.
