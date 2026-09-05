# WorkSphere fixed source

## Frontend

```bash
npm install
npm run dev
```

The Vite app runs on `http://localhost:5173`.

## Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:5000`.

## Environment files

Create `client/.env` from `.env.example` and fill in the existing Firebase values.

Create `client/backend/.env` from `backend/.env.example` and fill in the Cloudinary values.

Do not commit `.env` files.

## Important fixes in this package

- Tailwind CSS v4 is registered through the Vite Tailwind plugin.
- Cloudinary upload/delete exports are consistent across frontend and backend.
- Employee photos and documents use separate Cloudinary folders.
- Document uploads support PDF/DOC/DOCX/XLS/XLSX/TXT and images up to 10 MB.
- Employee photos remain limited to JPG/JPEG/PNG/WEBP up to 5 MB.
- Temporary backend upload files are cleaned up automatically.
- Notification subscriptions use separate Firestore queries to avoid the previous composite-index problem.
- The app title/favicon and global CSS are restored.
