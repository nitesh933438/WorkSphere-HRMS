import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const sw = readFileSync("public/sw.js", "utf8");
const required = [
  "src/App.jsx",
  "src/context/AuthContext.jsx",
  "src/services/notificationService.js",
  "src/services/announcementService.js",
  "src/services/departmentService.js",
  "src/services/employeeService.js",
  "src/services/leaveService.js",
  "src/services/requestService.js",
  "src/services/attendanceService.js",
  "src/services/payrollService.js",
  "src/utils/salarySlipPdf.js",
  "firestore.rules",
  "public/manifest.webmanifest",
  "public/sw.js",
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Missing release files: ${missing.join(", ")}`);
if (lock.version !== pkg.version || lock.packages?.[""]?.version !== pkg.version) {
  throw new Error("package-lock.json version is out of sync with package.json");
}
if (manifest.version !== pkg.version) {
  throw new Error("PWA manifest version is out of sync with package.json");
}
if (!sw.includes(`worksphere-shell-v${pkg.version}`)) {
  throw new Error("Service worker cache version is out of sync with package.json");
}
console.log(`WorkSphere release audit passed: v${pkg.version}`);
