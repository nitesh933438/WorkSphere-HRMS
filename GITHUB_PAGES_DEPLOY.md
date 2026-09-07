# WorkSphere — GitHub Pages deployment

This repaired version is configured for the repository `Company-Work`.

## 1. Frontend environment

Create `WorkSphere/.env` from `.env.example` and put your existing Firebase values there.

Do **not** commit `.env`.

## 2. Install and build

```bash
npm install
npm run build
```

## 3. Publish to GitHub Pages

Push to `main` to trigger the GitHub Actions Pages workflow:

`/.github/workflows/pages.yml`

The workflow builds the app, uploads the artifact, and retries the `deploy-pages` step once automatically if GitHub Pages returns a transient failure.

## 4. GitHub Pages setting

In GitHub:

`Company-Work` → `Settings` → `Pages`

Set the source to:

- **GitHub Actions**

Then the project site is:

`https://nitesh933438.github.io/Company-Work/`

The app uses `HashRouter`, so routes such as `#/login` and `#/dashboard` work on GitHub Pages without server-side rewrite support.

## Backend note

GitHub Pages hosts only the React frontend. The Express backend in `backend/` cannot run on GitHub Pages. Cloudinary upload/delete features therefore need the backend deployed separately (for example on a Node-compatible hosting service), and then `VITE_API_BASE_URL` should point to that backend before rebuilding.
