# WorkSphere v20

- Emergency relationship fields now use searchable suggestions while still allowing any manual value.
- Auth role bootstrap no longer attempts forbidden client-side role changes when a user document already has a role. Missing roles can be repaired as employee.
- Firestore user rule allows only missing-role repair to employee; assigned roles remain protected.
- Cloudinary backend exposes `/api/cloudinary/health` and returns clear 503/502 errors.
- Frontend checks Cloudinary backend health before uploading a profile photo.
- Version bumped to 1.0.18.
