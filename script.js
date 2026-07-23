'use strict';

/* =========================================================
   SnapText OCR — Application Logic
   Vanilla JS, no dependencies except Tesseract.js (CDN)
   ========================================================= */

// ---------- Constants ----------
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 20; // graceful handling of very large images
const MAX_DIMENSION = 4000; // px, images larger than this get a warning

// ---------- DOM References ----------
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadPrompt = document.getElementById('uploadPrompt');
const previewContent = document.getElementById('previewContent');
const previewImage = document.getElementById('previewImage');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');

const extractBtn = document.getElementById('extractBtn');
const resetImageBtn = document.getElementById('resetImageBtn');

const progressSection = document.getElementById('progressSection');
const progressLabel = document.getElementById('progressLabel');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');

const resultsSection = document.getElementById('resultsSection');
const resultText = document.getElementById('resultText');
const charCountEl = document.getElementById('charCount');
const wordCountEl = document.getElementById('wordCount');
const processTimeEl = document.getElementById('processTime');

const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');

const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

const intelSection = document.getElementById('intelSection');
const intelToggle = document.getElementById('intelToggle');
const intelBody = document.getElementById('intelBody');
const fileInfoCard = document.getElementById('fileInfoCard');
const hashCard = document.getElementById('hashCard');
const metadataCard = document.getElementById('metadataCard');
const privacyCard = document.getElementById('privacyCard');
const securityCard = document.getElementById('securityCard');
const imagePropsCard = document.getElementById('imagePropsCard');
const codeCard = document.getElementById('codeCard');

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

const scrollTopBtn = document.getElementById('scrollTopBtn');
const toastContainer = document.getElementById('toastContainer');

// ---------- State ----------
let selectedFile = null;
let selectedObjectUrl = null;
let ocrRunning = false;

// =========================================================
// Utility Functions
// =========================================================

/** Format bytes into a human readable string */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Show a toast notification */
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span aria-hidden="true">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/** Show an inline error message */
function showError(message) {
  errorMessage.textContent = message;
  errorBox.classList.remove('hidden');
  showToast(message, 'error');
}

/** Hide inline error message */
function hideError() {
  errorBox.classList.add('hidden');
}

/** Reset progress bar UI */
function resetProgressUI() {
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  progressBar.setAttribute('aria-valuenow', '0');
  progressLabel.textContent = 'Initializing OCR engine…';
}

/** Update progress bar UI */
function updateProgressUI(percent, label) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  progressFill.style.width = `${clamped}%`;
  progressPercent.textContent = `${clamped}%`;
  progressBar.setAttribute('aria-valuenow', String(clamped));
  if (label) progressLabel.textContent = label;
}

// =========================================================
// File Handling
// =========================================================

/** Validate a File object, returns { valid, message } */
function validateFile(file) {
  if (!file) {
    return { valid: false, message: 'No file was selected.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      message: `Unsupported file type "${file.type || 'unknown'}". Please upload a JPG, JPEG, PNG, or WEBP image.`,
    };
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      message: `Image is too large (${sizeMB.toFixed(1)} MB). Please use an image under ${MAX_FILE_SIZE_MB} MB.`,
    };
  }
  return { valid: true, message: '' };
}

/** Handle a newly selected/dropped file */
function handleFile(file) {
  hideError();
  const { valid, message } = validateFile(file);

  if (!valid) {
    showError(message);
    return;
  }

  selectedFile = file;

  // Revoke old object URL to avoid memory leaks
  if (selectedObjectUrl) {
    URL.revokeObjectURL(selectedObjectUrl);
  }
  selectedObjectUrl = URL.createObjectURL(file);

  previewImage.src = selectedObjectUrl;
  previewImage.onload = () => {
    // Warn about very large dimensions (graceful large-image handling)
    if (previewImage.naturalWidth > MAX_DIMENSION || previewImage.naturalHeight > MAX_DIMENSION) {
      showToast('This image is very large — OCR may take longer than usual.', 'info');
    }
  };

  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatFileSize(file.size);

  uploadPrompt.classList.add('hidden');
  previewContent.classList.remove('hidden');

  extractBtn.disabled = false;
  resetImageBtn.disabled = false;

  // Hide any previous results when a new image is chosen
  resultsSection.classList.add('hidden');

  runLocalIntelligence(file);

  showToast('Image loaded. Click "Extract Text" to begin.', 'success');
}

/** Reset the uploader back to its initial empty state */
function resetImage() {
  selectedFile = null;
  if (selectedObjectUrl) {
    URL.revokeObjectURL(selectedObjectUrl);
    selectedObjectUrl = null;
  }
  previewImage.src = '';
  fileInput.value = '';

  uploadPrompt.classList.remove('hidden');
  previewContent.classList.add('hidden');

  extractBtn.disabled = true;
  resetImageBtn.disabled = true;

  progressSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  intelSection.classList.add('hidden');
  hideError();
  resetProgressUI();
}

/** Fully clear everything including extracted text */
function clearAll() {
  resetImage();
  resultText.value = '';
  charCountEl.textContent = '0';
  wordCountEl.textContent = '0';
  processTimeEl.textContent = '0s';
  showToast('Cleared all data.', 'info');
}

// =========================================================
// Drag & Drop + Click-to-upload
// =========================================================

uploadZone.addEventListener('click', () => {
  if (!ocrRunning) fileInput.click();
});

uploadZone.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !ocrRunning) {
    e.preventDefault();
    fileInput.click();
  }
});

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleFile(file);
});

['dragenter', 'dragover'].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ocrRunning) uploadZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
  });
});

uploadZone.addEventListener('drop', (e) => {
  if (ocrRunning) return;
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Paste image from clipboard (Ctrl+V)
document.addEventListener('paste', (e) => {
  if (ocrRunning) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        handleFile(file);
        showToast('Image pasted from clipboard.', 'success');
      }
      break;
    }
  }
});

resetImageBtn.addEventListener('click', () => {
  if (ocrRunning) return;
  resetImage();
  showToast('Image reset.', 'info');
});

// =========================================================
// OCR Processing (Tesseract.js)
// =========================================================

/** Run OCR on the currently selected file */
async function runOCR() {
  if (!selectedFile || ocrRunning) return;

  hideError();
  ocrRunning = true;
  extractBtn.disabled = true;
  resetImageBtn.disabled = true;
  resultsSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  resetProgressUI();

  const startTime = performance.now();

  try {
    const { data } = await Tesseract.recognize(selectedFile, 'eng', {
      logger: (info) => {
        // info.status examples: 'loading tesseract core', 'initializing api',
        // 'recognizing text', etc. info.progress is 0..1
        if (typeof info.progress === 'number') {
          const percent = info.progress * 100;
          const label = formatStatusLabel(info.status);
          updateProgressUI(percent, label);
        }
      },
    });

    const endTime = performance.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

    displayResults(data.text || '', elapsedSeconds);
    showToast('Text extracted successfully!', 'success');
  } catch (err) {
    console.error('OCR Error:', err);
    showError('OCR failed to process this image. Please try a different image or check your internet connection (required to load the OCR engine on first use).');
  } finally {
    ocrRunning = false;
    extractBtn.disabled = false;
    resetImageBtn.disabled = false;
    progressSection.classList.add('hidden');
  }
}

/** Convert Tesseract status strings into friendlier labels */
function formatStatusLabel(status) {
  const map = {
    'loading tesseract core': 'Loading OCR engine…',
    'initializing tesseract': 'Initializing…',
    'initialized tesseract': 'Ready…',
    'loading language traineddata': 'Loading language data…',
    'loading language traineddata (from cache)': 'Loading language data…',
    'initializing api': 'Preparing recognition…',
    'recognizing text': 'Recognizing text…',
  };
  return map[status] || 'Processing…';
}

/** Display OCR results in the textarea with stats */
function displayResults(text, elapsedSeconds) {
  const trimmed = text.trim();
  resultText.value = trimmed;

  const charCount = trimmed.length;
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;

  charCountEl.textContent = charCount.toLocaleString();
  wordCountEl.textContent = wordCount.toLocaleString();
  processTimeEl.textContent = `${elapsedSeconds}s`;

  resultsSection.classList.remove('hidden');

  if (charCount === 0) {
    showToast('No text was detected in this image.', 'info');
  }
}

extractBtn.addEventListener('click', runOCR);

// =========================================================
// Results Actions: Copy / Download / Clear
// =========================================================

copyBtn.addEventListener('click', async () => {
  const text = resultText.value;
  if (!text) {
    showToast('There is no text to copy.', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!', 'success');
  } catch (err) {
    // Fallback for older browsers
    resultText.select();
    document.execCommand('copy');
    showToast('Text copied to clipboard!', 'success');
  }
});

downloadBtn.addEventListener('click', () => {
  const text = resultText.value;
  if (!text) {
    showToast('There is no text to download.', 'error');
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr-result-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Text file downloaded.', 'success');
});

clearBtn.addEventListener('click', clearAll);

// =========================================================
// Theme Toggle (Light / Dark)
// =========================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('snaptext-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('snaptext-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// =========================================================
// Local Intelligence Section Toggle
// =========================================================

intelToggle.addEventListener('click', () => {
  const isOpen = intelToggle.getAttribute('aria-expanded') === 'true';
  intelToggle.setAttribute('aria-expanded', String(!isOpen));
  intelBody.classList.toggle('hidden', isOpen);
});

// =========================================================
// Responsive Navigation Toggle
// =========================================================

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// =========================================================
// Scroll to Top Button
// =========================================================

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =========================================================
// Keyboard Shortcuts
// =========================================================

document.addEventListener('keydown', (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;

  // Ctrl+Enter: extract text
  if (isCtrl && e.key === 'Enter') {
    e.preventDefault();
    if (!extractBtn.disabled) runOCR();
  }

  // Ctrl+D: toggle theme
  if (isCtrl && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    themeToggle.click();
  }

  // Escape: clear everything
  if (e.key === 'Escape') {
    clearAll();
  }
});

// =========================================================
// Local Intelligence — File Signatures (Magic Numbers)
// =========================================================

// Known image magic numbers: hex signature -> format label
const MAGIC_NUMBERS = [
  { hex: '89504E47', format: 'PNG', mime: 'image/png' },
  { hex: 'FFD8FF', format: 'JPEG', mime: 'image/jpeg' },
  { hex: '52494646', format: 'WEBP', mime: 'image/webp' }, // RIFF container, checked further below
  { hex: '47494638', format: 'GIF', mime: 'image/gif' },
  { hex: '424D', format: 'BMP', mime: 'image/bmp' },
];

/** Read the first N bytes of a file and return an uppercase hex string */
async function readFileHeaderHex(file, byteCount = 12) {
  const buffer = await file.slice(0, byteCount).arrayBuffer();
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/** Identify format from a hex header by matching known magic numbers */
function identifyFormatFromHex(hex) {
  const match = MAGIC_NUMBERS.find((m) => hex.startsWith(m.hex));
  if (!match) return { format: 'Unknown', mime: null };
  // WEBP: RIFF header also needs "WEBP" at byte offset 8
  if (match.format === 'WEBP' && !hex.includes('57454250')) return { format: 'Unknown', mime: null };
  return { format: match.format, mime: match.mime };
}

// =========================================================
// Local Intelligence — Cryptographic Fingerprints
// =========================================================

/** Compute SHA-256 or SHA-1 using the native Web Crypto API */
async function computeWebCryptoHash(buffer, algorithm) {
  const digest = await crypto.subtle.digest(algorithm, buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Minimal MD5 implementation (Web Crypto does not support MD5) */
function computeMD5(buffer) {
  // Lightweight, dependency-free MD5 for forensic fingerprinting only (not for security use)
  function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  const msgLen = buffer.byteLength;
  const withPad = new Uint8Array(Math.ceil((msgLen + 9) / 64) * 64);
  withPad.set(new Uint8Array(buffer));
  withPad[msgLen] = 0x80;
  new DataView(withPad.buffer).setUint32(withPad.length - 8, msgLen * 8, true);

  const view = new DataView(withPad.buffer);
  for (let chunk = 0; chunk < withPad.length; chunk += 64) {
    const M = Array.from({ length: 16 }, (_, i) => view.getUint32(chunk + i * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      [A, D, C] = [D, C, B];
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const toLE = (n) => [0, 8, 16, 24].map((s) => (n >>> s) & 0xff).map((b) => b.toString(16).padStart(2, '0')).join('');
  return toLE(a0) + toLE(b0) + toLE(c0) + toLE(d0);
}

/** Minimal CRC32 implementation */
function computeCRC32(buffer) {
  const bytes = new Uint8Array(buffer);
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return ((~crc) >>> 0).toString(16).padStart(8, '0');
}

// =========================================================
// Local Intelligence — Security & Privacy Analysis
// =========================================================

const KNOWN_EXTENSIONS = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };

/** Run real browser-side security checks; returns array of {level, message} */
function analyzeSecurity(file, signature) {
  const findings = [];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const extParts = file.name.split('.');

  if (signature.mime && signature.mime !== file.type) {
    findings.push({ level: 'danger', message: `MIME mismatch: browser reports "${file.type}" but content is "${signature.mime}".` });
  } else if (!signature.mime) {
    findings.push({ level: 'warning', message: 'File signature does not match any known image format.' });
  } else {
    findings.push({ level: 'success', message: 'File signature matches declared MIME type.' });
  }

  const expectedExts = KNOWN_EXTENSIONS[file.type] || [];
  if (expectedExts.length && !expectedExts.includes(ext)) {
    findings.push({ level: 'warning', message: `Extension ".${ext}" does not match MIME type "${file.type}".` });
  } else {
    findings.push({ level: 'success', message: 'File extension matches MIME type.' });
  }

  if (extParts.length > 2) {
    findings.push({ level: 'warning', message: `Double extension detected in filename: "${file.name}".` });
  }

  if (/\.(exe|js|bat|cmd|scr|sh|vbs)\./i.test(file.name) || /[\x00-\x1f]/.test(file.name)) {
    findings.push({ level: 'danger', message: 'Suspicious filename pattern detected.' });
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    findings.push({ level: 'warning', message: `File exceeds recommended size (${MAX_FILE_SIZE_MB} MB).` });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    findings.push({ level: 'danger', message: `Unsupported or unrecognized image type: "${file.type || 'unknown'}".` });
  }

  return findings;
}

/** Derive privacy findings purely from actual metadata presence */
function analyzePrivacy(tags) {
  const hasGPS = !!(tags && (tags.GPSLatitude || tags.GPSLongitude));
  const hasCamera = !!(tags && (tags.Make || tags.Model));
  const hasSoftware = !!(tags && tags.Software);
  const metaCount = tags ? Object.keys(tags).length : 0;

  const flags = [hasGPS, hasCamera, hasSoftware, metaCount > 0].filter(Boolean).length;
  const rating = hasGPS ? 'Poor' : flags >= 2 ? 'Warning' : flags === 1 ? 'Good' : 'Excellent';

  return { hasGPS, hasCamera, hasSoftware, metaCount, rating };
}

// =========================================================
// Local Intelligence — Rendering Helpers
// =========================================================

function kvRow(label, value) {
  return `<div class="kv-row"><span class="kv-label">${label}</span><span class="kv-value">${value}</span></div>`;
}

function badge(level, text) {
  const icons = { success: '✅', warning: '⚠️', danger: '⛔' };
  return `<span class="badge badge-${level}">${icons[level] || ''} ${text}</span>`;
}

function hashRow(label, value) {
  const safeId = `hash-${label.replace(/\W/g, '')}`;
  return `
    <div class="hash-row">
      <div class="hash-label">${label}</div>
      <div class="hash-value-row">
        <div class="hash-value" id="${safeId}">${value}</div>
        <button type="button" class="hash-copy-btn" data-hash-target="${safeId}" title="Copy ${label}">📋</button>
      </div>
    </div>`;
}

// =========================================================
// Local Intelligence — Card Renderers (each isolated/fault-tolerant)
// =========================================================

async function renderFileInfoCard(file, img, signature) {
  try {
    const megapixels = ((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2);
    const aspect = (img.naturalWidth / img.naturalHeight).toFixed(2);
    fileInfoCard.innerHTML = [
      kvRow('File Name', file.name),
      kvRow('Extension', (file.name.split('.').pop() || 'n/a').toUpperCase()),
      kvRow('MIME Type', file.type || 'unknown'),
      kvRow('File Size', formatFileSize(file.size)),
      kvRow('Width', `${img.naturalWidth}px`),
      kvRow('Height', `${img.naturalHeight}px`),
      kvRow('Resolution', `${img.naturalWidth} × ${img.naturalHeight}`),
      kvRow('Aspect Ratio', aspect),
      kvRow('Megapixels', `${megapixels} MP`),
      kvRow('Color Space', signature.format === 'PNG' || signature.format === 'WEBP' ? 'RGB(A)' : 'RGB'),
      kvRow('Last Modified', new Date(file.lastModified).toLocaleString()),
      kvRow('File Signature', signature.hex.match(/.{1,2}/g).join(' ')),
    ].join('');
  } catch (err) {
    console.error('File Info error:', err);
    fileInfoCard.innerHTML = '<p class="intel-empty">Could not read file information.</p>';
  }
}

async function renderHashCard(file) {
  try {
    const buffer = await file.arrayBuffer();
    const [sha256, sha1] = await Promise.all([
      computeWebCryptoHash(buffer, 'SHA-256'),
      computeWebCryptoHash(buffer, 'SHA-1'),
    ]);
    const md5 = computeMD5(buffer);
    const crc32 = computeCRC32(buffer);

    hashCard.innerHTML = [
      hashRow('SHA-256', sha256),
      hashRow('SHA-1', sha1),
      hashRow('MD5', md5),
      hashRow('CRC32', crc32),
    ].join('');
  } catch (err) {
    console.error('Hash computation error:', err);
    hashCard.innerHTML = '<p class="intel-empty">Could not compute hashes.</p>';
  }
}

async function renderMetadataCard(file) {
  try {
    if (typeof ExifReader === 'undefined') {
      metadataCard.innerHTML = '<p class="intel-empty">Metadata library unavailable.</p>';
      return null;
    }
    const buffer = await file.arrayBuffer();
    const tags = ExifReader.load(buffer, { expanded: true });
    const flat = { ...tags.exif, ...tags.gps };
    const count = Object.keys(flat).length;

    if (count === 0) {
      metadataCard.innerHTML = '<p class="intel-empty">No metadata found.</p>';
      return null;
    }

    const gps = tags.gps && tags.gps.Latitude ? `${tags.gps.Latitude.toFixed(5)}, ${tags.gps.Longitude.toFixed(5)}` : 'Not present';
    metadataCard.innerHTML = [
      kvRow('Camera', flat.Make?.description || flat.Model?.description || 'Not present'),
      kvRow('Lens', flat.LensModel?.description || 'Not present'),
      kvRow('Software', flat.Software?.description || 'Not present'),
      kvRow('Orientation', flat.Orientation?.description || 'Not present'),
      kvRow('GPS', gps),
      kvRow('Date Taken', flat.DateTimeOriginal?.description || 'Not present'),
      kvRow('Date Modified', flat.ModifyDate?.description || 'Not present'),
      kvRow('Metadata Count', String(count)),
    ].join('');
    return flat;
  } catch (err) {
    console.error('Metadata analysis error:', err);
    metadataCard.innerHTML = '<p class="intel-empty">No metadata found.</p>';
    return null;
  }
}

function renderPrivacyCard(tags) {
  try {
    const p = analyzePrivacy(tags);
    const ratingLevel = { Excellent: 'success', Good: 'success', Warning: 'warning', Poor: 'danger' }[p.rating];
    privacyCard.innerHTML = `
      <div class="privacy-rating badge-${ratingLevel}">${p.rating}</div>
      ${kvRow('GPS Present', p.hasGPS ? 'Yes' : 'No')}
      ${kvRow('Camera Present', p.hasCamera ? 'Yes' : 'No')}
      ${kvRow('Metadata Present', p.metaCount > 0 ? 'Yes' : 'No')}
      ${kvRow('Location Present', p.hasGPS ? 'Yes' : 'No')}
      ${kvRow('Software Present', p.hasSoftware ? 'Yes' : 'No')}
    `;
  } catch (err) {
    console.error('Privacy analysis error:', err);
    privacyCard.innerHTML = '<p class="intel-empty">Could not analyze privacy.</p>';
  }
}

function renderSecurityCard(file, signature) {
  try {
    const findings = analyzeSecurity(file, signature);
    const rows = findings.map((f) => `<div class="finding-row">${badge(f.level, f.message)}</div>`).join('');
    securityCard.innerHTML = `
      ${kvRow('File Signature (hex)', signature.hex.match(/.{1,2}/g).join(' '))}
      ${kvRow('Detected Format', signature.format)}
      ${kvRow('Expected Format', (KNOWN_EXTENSIONS[file.type] || ['unknown'])[0].toUpperCase())}
      ${kvRow('Signature Match', signature.mime === file.type ? badge('success', 'Match') : badge('danger', 'Mismatch'))}
      <div style="margin-top:12px">${rows}</div>
    `;
  } catch (err) {
    console.error('Security analysis error:', err);
    securityCard.innerHTML = '<p class="intel-empty">Could not run security analysis.</p>';
  }
}

function renderImagePropsCard(file, img, signature) {
  try {
    const megapixels = ((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2);
    const aspect = (img.naturalWidth / img.naturalHeight).toFixed(2);
    imagePropsCard.innerHTML = [
      kvRow('Resolution', `${img.naturalWidth} × ${img.naturalHeight}`),
      kvRow('Aspect Ratio', aspect),
      kvRow('Megapixels', `${megapixels} MP`),
      kvRow('Transparency', signature.format === 'PNG' || signature.format === 'WEBP' ? 'Possible' : 'No'),
      kvRow('Animated', signature.format === 'GIF' ? 'Possible' : 'No'),
      kvRow('Compression', signature.format === 'JPEG' ? 'Lossy' : 'Lossless'),
      kvRow('Color Model', 'RGB'),
    ].join('');
  } catch (err) {
    console.error('Image properties error:', err);
    imagePropsCard.innerHTML = '<p class="intel-empty">Could not read image properties.</p>';
  }
}

/** Warn before opening any decoded URL, never open automatically */
function handleDecodedLinkClick(url) {
  const proceed = confirm(`This will open an external link:\n\n${url}\n\nOnly continue if you trust this source.`);
  if (proceed) window.open(url, '_blank', 'noopener,noreferrer');
}

async function renderCodeCard(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let qrResult = null;
    if (typeof jsQR === 'function') {
      qrResult = jsQR(imageData.data, canvas.width, canvas.height);
    }

    let barcodeResult = null;
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector();
        const barcodes = await detector.detect(canvas);
        if (barcodes.length) barcodeResult = barcodes[0].rawValue;
      } catch (err) {
        console.error('BarcodeDetector error:', err);
      }
    }

    const parts = [];
    if (qrResult) {
      parts.push(`<div class="kv-row"><span class="kv-label">QR Code</span><span class="kv-value">Detected</span></div>`);
      parts.push(`<div class="qr-result">${qrResult.data.replace(/</g, '&lt;')}</div>`);
      parts.push(`<button type="button" class="btn btn-secondary" id="copyQrBtn">📋 Copy</button>`);
    }
    if (barcodeResult) {
      parts.push(`<div class="kv-row" style="margin-top:10px"><span class="kv-label">Barcode</span><span class="kv-value">Detected</span></div>`);
      parts.push(`<div class="qr-result">${barcodeResult.replace(/</g, '&lt;')}</div>`);
    }
    if (!('BarcodeDetector' in window)) {
      parts.push('<p class="intel-empty" style="margin-top:8px">Barcode detection is not supported in this browser.</p>');
    }
    if (!qrResult && !barcodeResult) {
      parts.unshift('<p class="intel-empty">No QR code or barcode detected.</p>');
    }

    codeCard.innerHTML = parts.join('');

    const copyQrBtn = document.getElementById('copyQrBtn');
    if (copyQrBtn && qrResult) {
      copyQrBtn.addEventListener('click', () => navigator.clipboard.writeText(qrResult.data));
    }
    const qrLink = qrResult?.data.match(/^https?:\/\/\S+/);
    if (qrLink) {
      const warnBtn = document.createElement('button');
      warnBtn.type = 'button';
      warnBtn.className = 'btn btn-danger';
      warnBtn.style.marginLeft = '8px';
      warnBtn.textContent = '⚠️ Open Link';
      warnBtn.addEventListener('click', () => handleDecodedLinkClick(qrLink[0]));
      codeCard.appendChild(warnBtn);
    }
  } catch (err) {
    console.error('QR/Barcode detection error:', err);
    codeCard.innerHTML = '<p class="intel-empty">Could not scan for QR/barcode.</p>';
  }
}

// =========================================================
// Local Intelligence — Orchestrator
// =========================================================

/** Run all Local Intelligence modules; each is isolated so one failure never blocks the rest */
async function runLocalIntelligence(file) {
  intelSection.classList.remove('hidden');

  const signatureHex = await readFileHeaderHex(file).catch(() => '');
  const signature = { hex: signatureHex, ...identifyFormatFromHex(signatureHex) };

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

  renderFileInfoCard(file, img, signature);
  renderHashCard(file);
  renderSecurityCard(file, signature);
  renderImagePropsCard(file, img, signature);
  renderCodeCard(img);

  renderMetadataCard(file).then((tags) => renderPrivacyCard(tags));

  URL.revokeObjectURL(img.src);
}

// Event delegation for all hash "Copy" buttons (works for any number of hash rows)
hashCard.addEventListener('click', (e) => {
  const btn = e.target.closest('.hash-copy-btn');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.hashTarget);
  navigator.clipboard.writeText(target.textContent).then(() => showToast('Hash copied to clipboard!', 'success'));
});

// =========================================================
// Init
// =========================================================

function init() {
  initTheme();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  resetProgressUI();
}

document.addEventListener('DOMContentLoaded', init);