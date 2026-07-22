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
// Init
// =========================================================

function init() {
  initTheme();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  resetProgressUI();
}

document.addEventListener('DOMContentLoaded', init);