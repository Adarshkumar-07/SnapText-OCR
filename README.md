# SnapText OCR

A free, private, browser-based OCR (Optical Character Recognition) web app built with **plain HTML, CSS, and JavaScript** — no frameworks, no backend, no build tools. It uses [Tesseract.js](https://github.com/naptha/tesseract.js) (loaded via CDN) to extract text from images entirely inside the user's browser.

## ✨ Features

- 🖼️ Drag-and-drop or click-to-upload image input (JPG, JPEG, PNG, WEBP)
- 🔍 Client-side OCR text extraction — no image ever leaves your device
- 📊 Live OCR progress bar with percentage and status messages
- 📋 Copy extracted text to clipboard
- ⬇️ Download extracted text as a `.txt` file
- 🔄 Reset image / 🗑️ Clear all
- 🔢 Character count, word count, and processing time stats
- 🌗 Light / Dark mode toggle (remembers your preference)
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🍃 Glassmorphism UI with smooth animations and gradient background
- ⌨️ Keyboard shortcuts:
  - `Ctrl/Cmd + Enter` — Extract text
  - `Ctrl/Cmd + D` — Toggle theme
  - `Ctrl/Cmd + V` — Paste an image from clipboard
  - `Esc` — Clear everything
- ♿ Accessible: semantic HTML, ARIA attributes, keyboard navigable, skip link
- 🔔 Toast notifications for success/error/info events
- ❓ FAQ section, About section, feature cards, footer, scroll-to-top button

## 📁 Project Structure
ocr-website/
├── index.html    # Markup & structure
├── style.css     # All styling (glassmorphism, gradients, responsive layout)
├── script.js     # OCR logic, UI interactions, theme, shortcuts
└── README.md     # This file
## 🚀 Getting Started

No installation, no npm, no server required.

1. Download/clone all four files into the same folder.
2. Double-click `index.html` (or open it in any modern browser).
3. Drag an image onto the upload zone (or click to browse, or paste with `Ctrl+V`).
4. Click **Extract Text** and watch the progress bar.
5. Copy or download your extracted text.

> **Note:** Tesseract.js is loaded from a CDN (`cdn.jsdelivr.net`), so an internet connection is required the first time the OCR engine and language data are downloaded. Subsequent runs may use the browser cache.

## 🖥️ Browser Support

Tested and working on:
- Google Chrome (desktop & mobile)
- Microsoft Edge
- Mozilla Firefox
- Android WebView browsers

## 🛠️ Tech Stack

- **HTML5** — semantic structure, accessibility attributes
- **CSS3** — custom properties, glassmorphism, flexbox/grid, animations, media queries
- **Vanilla JavaScript (ES2017+)** — async/await, Fetch/Blob APIs, Clipboard API
- **[Tesseract.js v5](https://github.com/naptha/tesseract.js)** — WebAssembly OCR engine (via CDN, no install needed)

## 📐 How It Works

1. The user selects or drops an image file, which is validated for type (`image/jpeg`, `image/png`, `image/webp`) and size (≤ 20 MB).
2. A preview is generated using `URL.createObjectURL()`.
3. On clicking **Extract Text**, the app calls `Tesseract.recognize(file, 'eng', { logger })`.
4. The `logger` callback reports progress events (e.g., loading engine, loading language data, recognizing text), which update the progress bar and status label in real time.
5. Once complete, the recognized text, character count, word count, and elapsed time are displayed.
6. Users can copy the text to their clipboard or download it as a `.txt` file.

## ⚠️ Error Handling

The app gracefully handles:
- Unsupported file types (shows an inline error + toast)
- Oversized images (files over 20 MB are rejected with a clear message)
- Very large image dimensions (shows a warning toast that processing may take longer)
- OCR engine failures (network issues, corrupted images, etc.) with a friendly error message
- Empty OCR results (informs the user no text was detected)

## 🎨 Customization

- **Colors/Theme:** Edit CSS custom properties at the top of `style.css` (`:root` and `[data-theme="dark"]`).
- **OCR Language:** Change `'eng'` in the `Tesseract.recognize()` call inside `script.js` to another [supported language code](https://github.com/naptha/tesseract.js/blob/master/docs/api.md) (e.g., `'fra'`, `'spa'`, `'deu'`).
- **Max file size:** Adjust `MAX_FILE_SIZE_MB` in `script.js`.

## 📄 License

Free to use, modify, and distribute for personal or commercial projects.

---

Built with ❤️ using HTML, CSS, JavaScript, and Tesseract.js.
