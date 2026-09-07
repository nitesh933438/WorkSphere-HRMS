const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const TEMP_DIR = path.join(__dirname, "tmp");

fs.mkdirSync(TEMP_DIR, { recursive: true });

app.disable("x-powered-by");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://nitesh933438.github.io"
    ],
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "1mb",
}));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: TEMP_DIR,
    createParentPath: true,
    abortOnLimit: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  })
);

app.use(
  "/api/cloudinary",
  require("./routes/cloudinaryRoutes")
);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "WorkSphere backend is running.",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "WorkSphere API is healthy.",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error("SERVER ERROR:", err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    message: err?.message || "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(
    `WorkSphere backend running on http://localhost:${PORT}`
  );
});
