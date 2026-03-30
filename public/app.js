'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let messages       = [];
let currentRoadmap = null;
let currentStyle   = 'timeline';
let currentTheme   = 'blue';

// ── DOM refs ───────────────────────────────────────────────────────────────
const chatMessages       = document.getElementById('chat-messages');
const chatInput          = document.getElementById('chat-input');
const btnSend            = document.getElementById('btn-send');
const sendIcon           = document.getElementById('send-icon');
const sendSpinner        = document.getElementById('send-spinner');
const btnGenerate        = document.getElementById('btn-generate');
const btnPreview         = document.getElementById('btn-preview');
const previewFrame       = document.getElementById('preview-frame');
const previewPlaceholder = document.getElementById('preview-placeholder');
const styleSelect        = document.getElementById('style-select');
const themeSelect        = document.getElementById('theme-select');

// ── Init ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  addBotMessage(
    "Hi! I'm Projor, your roadmap assistant.\n\nLet's build a project roadmap together. What's the name of your project, and what is it about?"
  );
  chatInput.focus();

  // Style pill clicks on placeholder
  document.querySelectorAll('.ps-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.ps-pill').forEach((p) => p.classList.remove('ps-active'));
      pill.classList.add('ps-active');
      const s = pill.dataset.style;
      if (s) { styleSelect.value = s; applyStyleChange(s); }
    });
  });
});

const VALID_STYLES = new Set(['timeline', 'columns', 'vertical']);
const VALID_THEMES = new Set(['blue', 'green', 'purple', 'orange', 'dark']);
// ── Style / Theme pickers ──────────────────────────────────────────────────
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  if (currentRoadmap) {
    currentRoadmap.theme = currentTheme;
    updatePreview(currentRoadmap);
  }
});

function applyStyleChange(newStyle) {
  currentStyle = newStyle;
  if (currentRoadmap) {
    currentRoadmap.style = currentStyle;
    updatePreview(currentRoadmap);
  }
}

// ── Send ───────────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  autoResize(chatInput);
  addUserMessage(text);
  messages.push({ role: 'user', content: text });
  setLoading(true);
  const typingEl = addTypingIndicator();

  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    typingEl.remove();
    addBotMessage(data.message);
    messages.push({ role: 'assistant', content: data.message });

    if (data.roadmap) {
      currentRoadmap = data.roadmap;
      // Sync AI-suggested style & theme, but validate and don't override user's manual selection
      if (data.roadmap.style && VALID_STYLES.has(data.roadmap.style) && data.roadmap.style !== currentStyle) {
        currentStyle       = data.roadmap.style;
        styleSelect.value  = currentStyle;
      }
      if (data.roadmap.theme && VALID_THEMES.has(data.roadmap.theme) && data.roadmap.theme !== currentTheme) {
        currentTheme       = data.roadmap.theme;
        themeSelect.value  = currentTheme;
      }
      // Always apply current UI selections before preview
      currentRoadmap.style = currentStyle;
      currentRoadmap.theme = currentTheme;
      updatePreview(currentRoadmap);
      btnGenerate.disabled = false;
      btnPreview.disabled  = false;
    }
  } catch (err) {
    typingEl.remove();
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

// ── Preview ────────────────────────────────────────────────────────────────
async function updatePreview(roadmap) {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roadmap }),
    });
    if (!res.ok) return;
    const html = await res.text();
    previewFrame.srcdoc = html;
    previewFrame.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');
  } catch (_) { /* silent */ }
}

// ── Download ───────────────────────────────────────────────────────────────
btnGenerate.addEventListener('click', async () => {
  if (!currentRoadmap) return;
  const payload = { ...currentRoadmap, style: currentStyle, theme: currentTheme };
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roadmap: payload }),
    });
    if (!res.ok) { showToast('Failed to generate roadmap', 'error'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = sanitiseFilename(currentRoadmap.projectName || 'roadmap') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Roadmap downloaded ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── Preview button ─────────────────────────────────────────────────────────
btnPreview.addEventListener('click', () => {
  const html = previewFrame.srcdoc;
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

// ── Message rendering ──────────────────────────────────────────────────────
function addUserMessage(text) {
  const wrap   = document.createElement('div');
  wrap.className = 'bubble-wrap user';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(text) {
  const wrap   = document.createElement('div');
  wrap.className = 'bubble-wrap bot';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = renderMarkdown(text);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/** Minimal markdown: **bold** (within a line), line breaks */
function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

function addTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap bot';
  const ind  = document.createElement('div');
  ind.className  = 'typing-indicator';
  ind.innerHTML  = '<span></span><span></span><span></span>';
  wrap.appendChild(ind);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

// ── Input helpers ──────────────────────────────────────────────────────────
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatInput.addEventListener('input', () => autoResize(chatInput));
btnSend.addEventListener('click', sendMessage);

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function setLoading(on) {
  btnSend.disabled    = on;
  chatInput.disabled  = on;
  sendIcon.classList.toggle('hidden', on);
  sendSpinner.classList.toggle('hidden', !on);
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast${type ? ' toast-' + type : ''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ── Utilities ──────────────────────────────────────────────────────────────
function sanitiseFilename(name) {
  return (name || 'roadmap').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase().slice(0, 64);
}
