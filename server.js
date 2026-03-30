'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { generateRoadmapHTML } = require('./lib/roadmapGenerator');

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── OpenAI client (lazy, so the server starts without a key in dev) ──────────
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
    }
    const { OpenAI } = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Projor, a friendly project roadmap assistant. Your job is to help the user design a beautiful, informative project roadmap by gathering information conversationally.

Guide the user through these topics in a natural, helpful way:
1. Project name and a short description
2. Overall start date and end date
3. Project phases (e.g. Discovery, Design, Development, Launch) with their own start/end dates
4. Key milestones within each phase, their dates, and who is responsible
5. Team members and their roles
6. Visual theme preference: blue (default), green, purple, orange, or dark

After EVERY user message — even short ones — you MUST output an updated JSON block at the very end of your reply in the following exact format:
\`\`\`json
{
  "projectName": "...",
  "description": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "theme": "blue",
  "phases": [
    {
      "name": "Phase name",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "description": "Optional short description",
      "milestones": [
        { "name": "Milestone name", "date": "YYYY-MM-DD", "assignee": "Person name" }
      ]
    }
  ],
  "teamMembers": [
    { "name": "Person Name", "role": "Role" }
  ]
}
\`\`\`

Rules:
- Keep unknown fields as empty strings or empty arrays, never omit them.
- Dates must always be "YYYY-MM-DD" or an empty string.
- If the user hasn't provided a value yet, use sensible defaults (e.g. today for start, +6 months for end).
- Be concise, warm, and encouraging. Ask one or two questions at a time — don't overwhelm the user.
- When you feel you have enough information (at minimum a project name and one phase), suggest they can click "Generate Roadmap" to download the HTML file.`;

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  try {
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0].message.content;

    // Extract the JSON block (last ```json ... ``` in the reply)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/g);
    let roadmap = null;
    if (jsonMatch) {
      const lastBlock = jsonMatch[jsonMatch.length - 1];
      const inner = lastBlock.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      try { roadmap = JSON.parse(inner); } catch (_) { /* ignore parse errors */ }
    }

    // Strip the JSON block from the displayed message
    const displayContent = content.replace(/```json[\s\S]*?```/g, '').trim();

    res.json({ message: displayContent, roadmap });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to get AI response' });
  }
});

// ── POST /api/generate ───────────────────────────────────────────────────────
app.post('/api/generate', (req, res) => {
  const { roadmap } = req.body;
  if (!roadmap || typeof roadmap !== 'object') {
    return res.status(400).json({ error: 'roadmap object is required' });
  }

  try {
    const html = generateRoadmapHTML(roadmap);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitiseFilename(roadmap.projectName || 'roadmap')}.html"`
    );
    res.send(html);
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate roadmap' });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitiseFilename(name) {
  return name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase().slice(0, 64) || 'roadmap';
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Projor running at http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not set. Copy .env.example → .env and add your key.');
  }
});

module.exports = app; // for testing
