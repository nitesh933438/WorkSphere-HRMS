# WorkSphere Branding & Signature System v21

- Admin/HR can manage company branding in Settings.
- Company logo and authorized signature are uploaded through the existing Cloudinary backend.
- Branding is stored in `companySettings/branding` and is readable by signed-in users.
- Employees cannot edit company branding.
- Salary-slip PDF automatically attempts to embed the configured logo and authorized signature.
- If a branding image is unavailable, the salary slip still downloads without breaking.
- Authorized signer name/title are included below the signature.
- `package.json` is the source of truth for the app version; the prebuild script syncs the PWA manifest and service-worker cache.
