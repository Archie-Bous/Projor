'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let messages = [];        // [{role, content}] sent to /api/chat
let currentRoadmap = null; // last parsed roadmap JSON from AI

// ── DOM refs ───────────────────────────────────────────────────────────────
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const btnSend        = document.getElementById('btn-send');
const sendIcon       = document.getElementById('send-icon');
const sendSpinner    = document.getElementById('send-spinner');
const btnGenerate    = document.getElementById('btn-generate');
const btnPreview     = document.getElementById('btn-preview');
const previewFrame   = document.getElementById('preview-frame');
const previewPlaceholder = document.getElementById('preview-placeholder');

// ── Init ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  addBotMessage(
    "👋 Hi! I'm Projor, your AI roadmap assistant.\n\nLet's build a beautiful project roadmap together. To get started — **what's the name of your project**, and what is it about?"
  );
  chatInput.focus();
});

// ── Send logic ─────────────────────────────────────────────────────────────
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
    const res = await fetch('/api/chat', {
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
      updatePreview(data.roadmap);
      btnGenerate.disabled = false;
      btnPreview.disabled = false;
    }
  } catch (err) {
    typingEl.remove();
    showToast(err.message);
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
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roadmap: currentRoadmap }),
    });
    if (!res.ok) { showToast('Failed to generate roadmap'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitiseFilename(currentRoadmap.projectName || 'roadmap') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message);
  }
});

// ── Preview button ─────────────────────────────────────────────────────────
btnPreview.addEventListener('click', () => {
  if (!currentRoadmap) return;
  // Open the current srcdoc in a new tab
  const html = previewFrame.srcdoc;
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

// ── Message rendering ──────────────────────────────────────────────────────
function addUserMessage(text) {
  appendBubble('user', 'You', text);
}

function addBotMessage(text) {
  appendBubble('bot', 'Projor', text);
}

function appendBubble(role, sender, text) {
  const wrap = document.createElement('div');
  wrap.className = `bubble-wrap ${role}`;

  const senderEl = document.createElement('div');
  senderEl.className = 'bubble-sender';
  senderEl.textContent = sender;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text; // safe text content, no XSS

  wrap.appendChild(senderEl);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap bot';

  const senderEl = document.createElement('div');
  senderEl.className = 'bubble-sender';
  senderEl.textContent = 'Projor';

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';

  wrap.appendChild(senderEl);
  wrap.appendChild(indicator);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

// ── Input helpers ──────────────────────────────────────────────────────────
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

chatInput.addEventListener('input', () => autoResize(chatInput));
btnSend.addEventListener('click', sendMessage);

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function setLoading(on) {
  btnSend.disabled = on;
  chatInput.disabled = on;
  sendIcon.classList.toggle('hidden', on);
  sendSpinner.classList.toggle('hidden', !on);
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

// ── Utilities ──────────────────────────────────────────────────────────────
function sanitiseFilename(name) {
  return (name || 'roadmap').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase().slice(0, 64);
}
