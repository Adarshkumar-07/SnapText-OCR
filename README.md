# SnapText OCR

A free, fast, and private browser-based OCR (Optical Character Recognition) tool with built-in local cybersecurity and digital forensics analysis. Extract text from images instantly — no uploads, no servers, no tracking.

---

## ✨ Features

### OCR Extraction
- Drag & drop, click-to-browse, or paste (`Ctrl+V`) image upload
- Supports JPG, JPEG, PNG, and WEBP
- Powered by [Tesseract.js](https://github.com/naptha/tesseract.js) (WebAssembly OCR engine)
- Live progress bar with status updates
- Character count, word count, and elapsed time stats
- Copy to clipboard, download as `.txt`, or clear results

### 🛡 Local Intelligence (Cybersecurity & Forensics)
A collapsible panel below the OCR results that analyzes the uploaded image entirely in-browser:

| Card | What it shows |
|---|---|
| **File Information** | Name, extension, MIME type, size, dimensions, resolution, aspect ratio, megapixels, color space, last modified, magic number |
| **Cryptographic Fingerprints** | SHA-256, SHA-1, MD5, CRC32 hashes with one-click copy |
| **Metadata Analysis** | EXIF data via ExifReader — camera, lens, software, orientation, GPS, date taken/modified |
| **Privacy Analysis** | GPS/camera/software/metadata presence with an overall privacy rating (Excellent → Poor) |
| **Security Analysis** | Magic number vs MIME vs extension validation, double-extension detection, suspicious filenames, oversized files, unsupported formats |
| **Image Properties** | Resolution, aspect ratio, megapixels, transparency, animation, compression type, color model |
| **QR / Barcode Scanner** | Detects QR codes (jsQR) and barcodes (native `BarcodeDetector` API), with a mandatory confirmation warning before opening any decoded link |

### General
- Light/dark theme toggle (persisted locally)
- Fully responsive, glassmorphism UI
- Keyboard shortcuts: `Ctrl+Enter` (extract), `Ctrl+D` (theme), `Ctrl+V` (paste), `Esc` (clear)
- Accessible: skip links, ARIA live regions, focus states, reduced-motion support

---

## 🔒 Privacy & Security

**Everything runs 100% locally in your browser.**

- No backend, no server, no database, no cloud storage
- No image, file, or metadata is ever transmitted anywhere
- All hashing, metadata parsing, and QR/barcode scanning happen client-side
- External CDN scripts are loaded only for processing libraries (Tesseract.js, ExifReader, jsQR) — none of your data is sent to them
- Detected links are never opened automatically — you're always warned first

---

## 🛠 Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript (ES6+)** — no framework, no build step
- **[Tesseract.js](https://github.com/naptha/tesseract.js)** — OCR engine
- **[ExifReader](https://github.com/mattiasw/ExifReader)** — EXIF/metadata parsing
- **[jsQR](https://github.com/cozmo/jsQR)** — QR code detection
- **Web Crypto API** — SHA-256 / SHA-1 hashing (native)
- **BarcodeDetector API** — native barcode detection (with graceful fallback if unsupported)

---

## 📁 Project Structure

```
├── index.html   # Markup — OCR UI + Local Intelligence panel
├── style.css    # Glassmorphism design system (light/dark themes)
└── script.js    # OCR logic + Local Intelligence modules
```

---

## 🚀 Usage

1. Open `index.html` in any modern browser (no installation needed)
2. Upload an image via drag-and-drop, click, or paste
3. Click **Extract Text** to run OCR
4. Expand **🛡 Local Intelligence** to view forensic and security details about the file

> Note: An internet connection is required on first use to load Tesseract.js, ExifReader, and jsQR from CDN.

---

## 🌐 Browser Support

| Feature | Notes |
|---|---|
| Core OCR | All modern browsers (Chrome, Firefox, Safari, Edge) |
| SHA-256 / SHA-1 hashing | Requires HTTPS or `localhost` (Web Crypto API) |
| Barcode detection | Chrome/Edge only — other browsers show a graceful "not supported" message |
| QR detection | All modern browsers (via jsQR) |

---

## ⚠️ Disclaimer

The Local Intelligence tools are designed for educational, forensic-awareness, and privacy-checking purposes. MD5 and CRC32 are provided for file-identification/integrity comparison only — they are not cryptographically secure and should not be relied upon for security-critical verification.

---

## 📄 License

This project is free to use, modify, and distribute.
