const PAGE_W = 595;
const PAGE_H = 842;

const escapePdfText = (value = "") => {
  const text = String(value ?? "")
    .replace(/₹/g, "Rs.")
    .replace(/€/g, "EUR ")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/“|”/g, '"')
    .replace(/’/g, "'");

  // Helvetica in a simple PDF uses WinAnsi. Replace characters that cannot
  // be represented safely rather than generating a corrupt/blank PDF.
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? char : "?";
    })
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const fmt = (value) => {
  const amount = Number(value) || 0;
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

const normalizePayrollFinancials = (data = {}) => {
  const num = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
  const round = (value) => Math.round((num(value) + Number.EPSILON) * 100) / 100;
  const basicSalary = round(data.basicSalary);
  const allowances = round(data.allowances);
  const grossSalary = round(basicSalary + allowances);
  const attendanceDeduction = round(Math.max(0, num(data.attendanceDeduction)));
  const fixedDeductions = round(Math.max(0, data.fixedDeductions !== undefined
    ? num(data.fixedDeductions)
    : num(data.deductions) - attendanceDeduction));
  const overtimePay = round(Math.max(0, num(data.overtimePay)));
  const deductions = round(attendanceDeduction + fixedDeductions);
  const netSalary = round(Math.max(0, grossSalary + overtimePay - deductions));
  return { basicSalary, allowances, grossSalary, attendanceDeduction, fixedDeductions, overtimePay, deductions, netSalary };
};

const text = (ops, x, y, value, size = 10, font = "F1", color = [0.07, 0.10, 0.18]) => {
  ops.push(`${color[0]} ${color[1]} ${color[2]} rg`);
  ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
};

const rect = (ops, x, y, w, h, fill, stroke = null, lineWidth = 1) => {
  if (fill) ops.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
  if (stroke) ops.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG ${lineWidth} w`);
  ops.push(`${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}`);
};

const line = (ops, x1, y1, x2, y2, color = [0.86, 0.88, 0.92], width = 1) => {
  ops.push(`${color[0]} ${color[1]} ${color[2]} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
};

const rightText = (ops, xRight, y, value, size = 10, font = "F1", color) => {
  const clean = String(value ?? "");
  const approxWidth = clean.length * size * 0.52;
  text(ops, xRight - approxWidth, y, clean, size, font, color);
};

const dataUrlToBytes = (dataUrl) => {
  const base64 = String(dataUrl).split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const getJpegSize = (bytes) => {
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) + bytes[i + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: (bytes[i + 7] << 8) + bytes[i + 8], height: (bytes[i + 5] << 8) + bytes[i + 6] };
    }
    i += 2 + length;
  }
  return { width: 1, height: 1 };
};

const fetchAsJpeg = async (url) => {
  if (!url) return null;
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`Unable to load branding image (${response.status}).`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to decode branding image."));
      img.src = objectUrl;
    });
    const max = 1000;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const bytes = dataUrlToBytes(dataUrl);
    const size = getJpegSize(bytes);
    return { bytes, width: size.width, height: size.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const buildPdfBytes = (pageContents, images = {}) => {
  // Build the PDF as real bytes. The previous implementation assembled the
  // whole document as a JavaScript string, which corrupts JPEG bytes above
  // 0x7F when TextEncoder converts the string to UTF-8. That can produce a
  // downloaded PDF that opens as a blank/white page when a logo or signature
  // is embedded. Keeping binary image streams as Uint8Array fixes that class
  // of corruption and makes the PDF deterministic.
  const encoder = new TextEncoder();
  const objects = [];
  const addObject = (value) => { objects.push(value); return objects.length; };
  const catalog = addObject(null);
  const pages = addObject(null);
  const fontRegular = addObject(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  const fontBold = addObject(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  const fontItalic = addObject(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>'));
  const imageRefs = {};

  Object.entries(images).forEach(([name, image]) => {
    if (!image?.bytes?.length) return;
    const prefix = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    const suffix = encoder.encode('\nendstream');
    const bytes = new Uint8Array(prefix.length + image.bytes.length + suffix.length);
    bytes.set(prefix, 0);
    bytes.set(image.bytes, prefix.length);
    bytes.set(suffix, prefix.length + image.bytes.length);
    imageRefs[name] = addObject(bytes);
  });

  const xObjects = Object.entries(imageRefs).map(([name, ref]) => `/${name} ${ref} 0 R`).join(' ');
  const resource = xObjects ? `/XObject << ${xObjects} >>` : '';
  const pageRefs = [];

  pageContents.forEach((content) => {
    const stream = `q\n${content}\nQ`;
    const contentRef = objects.length + 2;
    const pageRef = addObject(encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R /F3 ${fontItalic} 0 R >> ${resource} >> /Contents ${contentRef} 0 R >>`));
    const streamBytes = encoder.encode(stream);
    const contentBody = encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n`);
    const contentEnd = encoder.encode('\nendstream');
    const contentObject = new Uint8Array(contentBody.length + streamBytes.length + contentEnd.length);
    contentObject.set(contentBody, 0);
    contentObject.set(streamBytes, contentBody.length);
    contentObject.set(contentEnd, contentBody.length + streamBytes.length);
    addObject(contentObject);
    pageRefs.push(pageRef);
  });

  objects[0] = encoder.encode(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
  objects[1] = encoder.encode(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`);

  const header = encoder.encode('%PDF-1.4\n');
  const objectParts = [];
  const offsets = [0];
  let totalLength = header.length;

  objects.forEach((body, index) => {
    const objectBody = body instanceof Uint8Array ? body : encoder.encode(String(body));
    const prefix = encoder.encode(`${index + 1} 0 obj\n`);
    const suffix = encoder.encode('\nendobj\n');
    offsets.push(totalLength);
    const part = new Uint8Array(prefix.length + objectBody.length + suffix.length);
    part.set(prefix, 0);
    part.set(objectBody, prefix.length);
    part.set(suffix, prefix.length + objectBody.length);
    objectParts.push(part);
    totalLength += part.length;
  });

  const xrefOffset = totalLength;
  const xrefLines = [`xref`, `0 ${objects.length + 1}`, `0000000000 65535 f `];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const tail = encoder.encode(`${xrefLines.join('\n')}\n${trailer}`);

  const result = new Uint8Array(totalLength + tail.length);
  let cursor = 0;
  result.set(header, cursor); cursor += header.length;
  objectParts.forEach((part) => { result.set(part, cursor); cursor += part.length; });
  result.set(tail, cursor);
  return result;
};

const wrapText = (value, maxChars) => {
  const source = String(value ?? "").trim();
  if (!source) return [""];
  const words = source.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    // Hard-wrap unusually long IDs/emails so nothing escapes the page.
    if (word.length > maxChars) {
      if (current) { lines.push(current); current = ""; }
      for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      return;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const drawWrapped = (ops, x, y, value, options = {}) => {
  const { size = 9, font = "F1", color, maxChars = 62, leading = size + 3, maxLines = 4 } = options;
  const lines = wrapText(value, maxChars).slice(0, maxLines);
  lines.forEach((lineValue, index) => text(ops, x, y - index * leading, lineValue, size, font, color));
  return y - lines.length * leading;
};

const fitImage = (image, maxW, maxH) => {
  if (!image) return null;
  const scale = Math.min(maxW / Math.max(image.width, 1), maxH / Math.max(image.height, 1), 1);
  return { w: Math.max(1, image.width * scale), h: Math.max(1, image.height * scale) };
};

export const downloadSalarySlipPdf = async ({ payroll, employee, branding = {} }) => {
  if (!payroll) throw new Error("Payroll data is required.");

  // Always keep the employee directory/profile identity in preference to the
  // historical payroll snapshot. Financial values remain historical.
  const name = employee?.fullName || employee?.name || payroll.employeeName || "Employee";
  const code = employee?.employeeCode || payroll.employeeCode || payroll.employeeId || "-";
  const email = employee?.email || payroll.employeeEmail || "-";
  const department = employee?.department || payroll.department || "-";
  const designation = employee?.designation || payroll.designation || "-";
  const companyName = branding.companyName || "WorkSphere";
  const period = payroll.month && payroll.year
    ? `${new Date(2000, Number(payroll.month) - 1, 1).toLocaleString("en-IN", { month: "long" })} ${payroll.year}`
    : payroll.period || payroll.monthKey || "-";
  const paymentDate = payroll.paymentDate
    ? new Date(payroll.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";
  const status = payroll.status || "Pending";
  const financials = normalizePayrollFinancials(payroll);

  const navy = [0.055, 0.075, 0.15];
  const purple = [0.34, 0.25, 0.90];
  const purpleSoft = [0.95, 0.94, 1.0];
  const soft = [0.955, 0.965, 0.985];
  const border = [0.86, 0.88, 0.93];
  const muted = [0.38, 0.44, 0.54];
  const green = [0.08, 0.55, 0.36];
  const red = [0.78, 0.12, 0.14];
  const white = [1, 1, 1];

  let logoImage = null;
  let signatureImage = null;
  if (branding.logoUrl) {
    try { logoImage = await fetchAsJpeg(branding.logoUrl); } catch { logoImage = null; }
  }
  if (branding.signatureUrl) {
    try { signatureImage = await fetchAsJpeg(branding.signatureUrl); } catch { signatureImage = null; }
  }

  // Premium single-page A4 layout. The page uses fixed vertical bands so
  // identity, payroll figures, branding and signature never overlap.
  const ops = [];
  const safeLeft = 36;
  const safeRight = 559;
  const contentW = safeRight - safeLeft;

  rect(ops, 0, 0, PAGE_W, PAGE_H, white);

  // -----------------------------------------------------------------------
  // HEADER / BRANDING
  // -----------------------------------------------------------------------
  rect(ops, 0, 768, PAGE_W, 74, navy);
  rect(ops, 0, 768, 9, 74, purple);

  const logoBoxX = 40;
  const logoBoxY = 785;
  const logoBoxW = 62;
  const logoBoxH = 40;
  rect(ops, logoBoxX, logoBoxY, logoBoxW, logoBoxH, white, null, 0);
  if (logoImage) {
    const logoFit = fitImage(logoImage, logoBoxW - 8, logoBoxH - 8);
    if (logoFit) {
      const logoX = logoBoxX + (logoBoxW - logoFit.w) / 2;
      const logoY = logoBoxY + (logoBoxH - logoFit.h) / 2;
      ops.push(`q ${logoFit.w} 0 0 ${logoFit.h} ${logoX} ${logoY} cm /ImLogo Do Q`);
    }
  } else {
    text(ops, logoBoxX + 18, logoBoxY + 14, "WS", 12, "F2", purple);
  }

  // Company name is deliberately printed even when a logo exists.
  drawWrapped(ops, 114, 813, companyName, {
    size: 17,
    font: "F2",
    color: white,
    maxChars: 28,
    maxLines: 2,
    leading: 17,
  });
  text(ops, 114, 791, "Employee Operations Platform", 7.5, "F3", [0.76, 0.80, 0.90]);

  rightText(ops, safeRight, 815, "SALARY SLIP", 13, "F2", white);
  rightText(ops, safeRight, 798, period, 9, "F1", [0.78, 0.82, 0.92]);
  rightText(ops, safeRight, 783, "CONFIDENTIAL PAYROLL DOCUMENT", 6.5, "F2", [0.63, 0.68, 0.80]);

  // -----------------------------------------------------------------------
  // EMPLOYEE HERO / IDENTITY
  // -----------------------------------------------------------------------
  rect(ops, safeLeft, 697, contentW, 55, soft, border, 1);
  rect(ops, safeLeft, 697, 5, 55, purple);
  text(ops, 51, 736, "EMPLOYEE", 7, "F2", muted);
  drawWrapped(ops, 51, 718, name, { size: 13, font: "F2", color: navy, maxChars: 30, maxLines: 2, leading: 13 });

  text(ops, 255, 736, "EMPLOYEE ID", 7, "F2", muted);
  drawWrapped(ops, 255, 718, code, { size: 10, font: "F2", color: navy, maxChars: 24, maxLines: 2, leading: 10 });

  text(ops, 425, 736, "STATUS", 7, "F2", muted);
  text(ops, 425, 718, status, 9.5, "F2", String(status).toLowerCase() === "paid" ? green : purple);

  // -----------------------------------------------------------------------
  // EMPLOYEE INFORMATION
  // -----------------------------------------------------------------------
  text(ops, safeLeft, 677, "EMPLOYEE INFORMATION", 8.5, "F2", purple);
  line(ops, safeLeft, 669, safeRight, 669, border, 1);

  const cols = [50, 225, 400];
  const infoRows = [
    [["Full Name", name], ["Email", email], ["Payment Date", paymentDate]],
    [["Department", department], ["Designation", designation], ["Employment Status", status]],
  ];
  let iy = 650;
  infoRows.forEach((rowData) => {
    rowData.forEach(([label, value], index) => {
      text(ops, cols[index], iy, label, 7, "F2", muted);
      drawWrapped(ops, cols[index], iy - 12, value, {
        size: 8.2,
        color: navy,
        maxChars: index === 1 ? 29 : 24,
        maxLines: 2,
        leading: 9,
      });
    });
    iy -= 28;
  });

  // -----------------------------------------------------------------------
  // EARNINGS / DEDUCTIONS
  // -----------------------------------------------------------------------
  text(ops, safeLeft, 591, "SALARY BREAKDOWN", 8.5, "F2", purple);
  rect(ops, safeLeft, 397, contentW, 176, white, border, 1);
  rect(ops, safeLeft, 545, contentW, 28, purpleSoft);
  text(ops, 52, 555, "Earnings & deductions", 8.5, "F2", navy);
  rightText(ops, 542, 555, "Amount", 8.5, "F2", navy);

  const rows = [
    ["Basic Salary", fmt(financials.basicSalary), navy],
    ["Allowances", `+ ${fmt(financials.allowances)}`, green],
    ["Gross Salary", fmt(financials.grossSalary), navy],
    ["Attendance / Unpaid Absence", `- ${fmt(financials.attendanceDeduction)}`, red],
    ["Other / Fixed Deductions", `- ${fmt(financials.fixedDeductions)}`, red],
    ["Overtime Pay", `+ ${fmt(financials.overtimePay)}`, green],
  ];
  let ry = 525;
  rows.forEach(([label, value, color], index) => {
    text(ops, 52, ry, label, 8.8, index === 2 ? "F2" : "F1", navy);
    rightText(ops, 542, ry, value, 8.8, "F2", color);
    if (index < rows.length - 1) line(ops, 52, ry - 8, 543, ry - 8, [0.92, 0.93, 0.96], 0.6);
    ry -= 23;
  });

  // -----------------------------------------------------------------------
  // NET PAYABLE
  // -----------------------------------------------------------------------
  rect(ops, safeLeft, 338, contentW, 47, navy);
  text(ops, 52, 365, "NET PAYABLE", 8.2, "F2", [0.75, 0.80, 0.91]);
  text(ops, 52, 350, "Final amount payable to employee", 7, "F3", [0.65, 0.70, 0.82]);
  rightText(ops, 542, 352, fmt(financials.netSalary), 15, "F2", white);

  // -----------------------------------------------------------------------
  // PAYMENT + ATTENDANCE
  // -----------------------------------------------------------------------
  rect(ops, safeLeft, 280, contentW, 44, soft, border, 1);
  text(ops, 52, 306, "PAYMENT DETAILS", 7.5, "F2", muted);
  drawWrapped(ops, 52, 292, `Method: ${payroll.paymentMethod || "-"}`, { size: 7.7, color: navy, maxChars: 38, maxLines: 1 });
  drawWrapped(ops, 300, 292, `Transaction: ${payroll.transactionId || "-"}`, { size: 7.7, color: navy, maxChars: 38, maxLines: 1 });

  const attendance = payroll.attendanceSummary || {};
  const attendanceLine = attendance.workingDays
    ? `Attendance: ${attendance.presentDays ?? 0} present • ${attendance.paidLeaveDays ?? 0} paid leave • ${attendance.unpaidDays ?? 0} unpaid/absent • ${attendance.workingDays} working days`
    : "Attendance: Not available";
  drawWrapped(ops, 52, 264, attendanceLine, { size: 7.4, color: muted, maxChars: 105, maxLines: 2, leading: 9 });

  // -----------------------------------------------------------------------
  // NOTES
  // -----------------------------------------------------------------------
  text(ops, safeLeft, 232, "NOTES", 7.5, "F2", muted);
  const notes = String(payroll.notes || "").trim();
  const noteLines = wrapText(notes || "No additional notes.", 105).slice(0, 2);
  noteLines.forEach((lineValue, index) => {
    text(ops, 52, 218 - index * 9, lineValue, 7.6, "F1", navy);
  });

  // -----------------------------------------------------------------------
  // SIGNATURE / FOOTER
  // -----------------------------------------------------------------------
  line(ops, safeLeft, 142, safeRight, 142, border, 1);
  text(ops, 38, 119, "This is a computer-generated salary slip.", 7.2, "F3", muted);

  const sigFit = fitImage(signatureImage, 118, 36);
  if (sigFit) {
    const sigX = safeRight - sigFit.w;
    ops.push(`q ${sigFit.w} 0 0 ${sigFit.h} ${sigX} 151 cm /ImSignature Do Q`);
  }
  rightText(ops, safeRight, 120, branding.signerName || "Authorized Signatory", 8, "F2", navy);
  rightText(ops, safeRight, 108, branding.signerTitle || "Authorized Signatory", 7, "F3", muted);
  rightText(ops, safeRight, 70, `${companyName} Payroll`, 7.2, "F2", muted);

  const bytes = buildPdfBytes([ops.join("\n")], { ImLogo: logoImage, ImSignature: signatureImage });
  const blob = new Blob([bytes], { type: "application/pdf" });
  if (!blob.size) throw new Error("Generated salary slip PDF is empty.");

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  // Keep downloaded salary slips predictable and professional so they are
  // easy to search, sort, archive, and share. The company name stays inside
  // the PDF header; the filename uses the employee identity + payroll period.
  const safePart = (value, fallback) => String(value ?? "")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || fallback;
  const safeName = safePart(name, "Employee");
  const safeCode = safePart(code, "ID");
  const safePeriod = safePart(period, "Period");
  anchor.download = `Salary-Slip_${safeName}_${safeCode}_${safePeriod}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
