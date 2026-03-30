'use strict';

/**
 * Generates a self-contained HTML roadmap file from a roadmap data object.
 *
 * @param {Object} data
 * @param {string}  data.projectName
 * @param {string}  [data.description]
 * @param {string}  data.startDate   - YYYY-MM-DD
 * @param {string}  data.endDate     - YYYY-MM-DD
 * @param {string}  [data.theme]     - 'blue'|'green'|'purple'|'orange'|'dark'
 * @param {string}  [data.style]     - 'timeline'|'columns'|'vertical'
 * @param {Array}   data.phases
 * @param {Array}   [data.teamMembers]
 * @returns {string}
 */
function generateRoadmapHTML(data) {
  const {
    projectName = 'Untitled Project',
    description = '',
    startDate,
    endDate,
    theme = 'blue',
    style = 'timeline',
    phases = [],
    teamMembers = [],
  } = data;

  // ── Themes ───────────────────────────────────────────────────────────────
  const THEMES = {
    blue: {
      primary: '#2563eb', accent: '#3b82f6', accentLight: '#eff6ff',
      headerGrad: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 100%)',
      bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0',
      text: '#0f172a', textMuted: '#64748b',
      phaseColors: ['#2563eb','#0284c7','#0891b2','#0d9488','#059669','#7c3aed'],
    },
    green: {
      primary: '#16a34a', accent: '#22c55e', accentLight: '#f0fdf4',
      headerGrad: 'linear-gradient(135deg,#14532d 0%,#15803d 55%,#22c55e 100%)',
      bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0',
      text: '#0f172a', textMuted: '#64748b',
      phaseColors: ['#16a34a','#0d9488','#0284c7','#7c3aed','#db2777','#ea580c'],
    },
    purple: {
      primary: '#7c3aed', accent: '#a855f7', accentLight: '#faf5ff',
      headerGrad: 'linear-gradient(135deg,#3b0764 0%,#6d28d9 55%,#a855f7 100%)',
      bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0',
      text: '#0f172a', textMuted: '#64748b',
      phaseColors: ['#7c3aed','#4f46e5','#2563eb','#0891b2','#0d9488','#db2777'],
    },
    orange: {
      primary: '#ea580c', accent: '#f97316', accentLight: '#fff7ed',
      headerGrad: 'linear-gradient(135deg,#7c2d12 0%,#c2410c 55%,#f97316 100%)',
      bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0',
      text: '#0f172a', textMuted: '#64748b',
      phaseColors: ['#ea580c','#dc2626','#db2777','#7c3aed','#2563eb','#0d9488'],
    },
    dark: {
      primary: '#818cf8', accent: '#6366f1', accentLight: '#1e1b4b',
      headerGrad: 'linear-gradient(135deg,#020617 0%,#0f172a 55%,#1e293b 100%)',
      bg: '#0f172a', cardBg: '#1e293b', border: '#334155',
      text: '#f1f5f9', textMuted: '#94a3b8',
      phaseColors: ['#818cf8','#38bdf8','#34d399','#fbbf24','#f87171','#c084fc'],
    },
  };

  const t = THEMES[theme] || THEMES.blue;

  const start   = isValidDate(startDate) ? new Date(startDate) : new Date();
  const end     = isValidDate(endDate)   ? new Date(endDate)   : addMonths(start, 6);
  const totalMs = Math.max(end - start, 1);

  // Enrich phases with colours
  const enrichedPhases = phases.map((p, i) => ({
    ...p,
    color: p.color || t.phaseColors[i % t.phaseColors.length],
  }));

  // ── Helpers ───────────────────────────────────────────────────────────────
  function pct(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (d <= start) return 0;
    if (d >= end)   return 100;
    return ((d - start) / totalMs) * 100;
  }

  function durationFlex(phase) {
    if (!isValidDate(phase.startDate) || !isValidDate(phase.endDate)) return 1;
    const ms = Math.max(new Date(phase.endDate) - new Date(phase.startDate), 0);
    return Math.max(ms / (1000 * 60 * 60 * 24 * 7), 1); // weeks, min 1
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtMonthYear(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('default', { month: 'short', year: 'numeric' });
  }

  function quarterLabel(d) {
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  }

  function buildMilestoneChips(phase, extraClass = '') {
    return (phase.milestones || []).map((m) => `
      <div class="ms-chip${extraClass ? ' ' + extraClass : ''}">
        <span class="ms-diamond" style="background:${phase.color}"></span>
        <span class="ms-chip-name">${esc(m.name)}</span>
        ${m.date ? `<span class="ms-chip-date">${fmtDate(m.date)}</span>` : ''}
        ${m.assignee ? `<span class="ms-chip-who" style="color:${phase.color}">${esc(m.assignee)}</span>` : ''}
      </div>`).join('');
  }

  // ── Team section (shared) ─────────────────────────────────────────────────
  function buildTeamSection() {
    if (!teamMembers.length) return '';
    const cards = teamMembers.map((m) => {
      const name     = typeof m === 'string' ? m : (m.name || '');
      const role     = typeof m === 'object' ? (m.role || '') : '';
      const initials = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      return `
        <div class="team-chip">
          <div class="team-avatar" style="background:${t.primary}">${initials}</div>
          <div>
            <div class="team-name">${esc(name)}</div>
            ${role ? `<div class="team-role">${esc(role)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <section class="team-section">
        <h2 class="section-label">Team</h2>
        <div class="team-grid">${cards}</div>
      </section>`;
  }

  // ── Style: timeline ───────────────────────────────────────────────────────
  // Horizontal roadmap — phases as proportional-width cards on a spine.
  function renderTimeline() {
    if (!enrichedPhases.length) {
      return `<section class="tl-wrap"><p class="empty-msg">No phases defined yet.</p></section>`;
    }

    // Quarter marks for the axis
    const quarters = [];
    const qCur = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
    while (qCur <= end) {
      quarters.push({ label: quarterLabel(qCur), pct: pct(qCur.toISOString().slice(0, 10)) });
      qCur.setMonth(qCur.getMonth() + 3);
    }

    const axisMarkers = quarters.map((q) =>
      `<div class="tl-axis-mark" style="left:${q.pct.toFixed(2)}%">${q.label}</div>`
    ).join('');

    const phaseSegments = enrichedPhases.map((phase) => {
      const flexVal = durationFlex(phase).toFixed(2);
      const chips   = buildMilestoneChips(phase);
      return `
        <div class="tl-phase" style="flex:${flexVal};--phase-color:${phase.color}">
          <div class="tl-phase-inner">
            <div class="tl-phase-accent" style="background:${phase.color}"></div>
            <div class="tl-phase-body">
              <div class="tl-phase-name">${esc(phase.name)}</div>
              ${phase.startDate || phase.endDate
                ? `<div class="tl-phase-dates">${fmtMonthYear(phase.startDate)}${phase.endDate ? ' – ' + fmtMonthYear(phase.endDate) : ''}</div>`
                : ''}
              ${phase.description ? `<p class="tl-phase-desc">${esc(phase.description)}</p>` : ''}
              ${chips ? `<div class="tl-milestones">${chips}</div>` : ''}
            </div>
          </div>
          <div class="tl-phase-connector"><div class="tl-connector-dot" style="background:${phase.color}"></div></div>
        </div>`;
    }).join('');

    return `
      <section class="tl-wrap">
        <div class="tl-phases">${phaseSegments}</div>
        <div class="tl-axis">
          <div class="tl-axis-spine"></div>
          <div class="tl-axis-marks">${axisMarkers}</div>
          <div class="tl-axis-endpoints">
            <span>${fmtMonthYear(startDate)}</span>
            <span>${fmtMonthYear(endDate)}</span>
          </div>
        </div>
      </section>`;
  }

  // ── Style: columns ────────────────────────────────────────────────────────
  // Quarterly kanban — phases grouped by starting quarter.
  function renderColumns() {
    // Build quarter slots covering the project span
    const slots = [];
    const sC = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
    while (sC <= end) {
      const qEnd = new Date(sC.getFullYear(), sC.getMonth() + 3, 0);
      slots.push({ label: quarterLabel(sC), start: new Date(sC), end: qEnd, phases: [] });
      sC.setMonth(sC.getMonth() + 3);
    }

    // Place each phase in the slot where it starts
    enrichedPhases.forEach((phase) => {
      const ps = phase.startDate ? new Date(phase.startDate) : start;
      const slot = slots.find((s) => ps >= s.start && ps <= s.end) || slots[0];
      if (slot) slot.phases.push(phase);
    });

    const columns = slots.map((slot) => {
      const cards = slot.phases.map((phase) => `
        <div class="col-card" style="border-left:3px solid ${phase.color}">
          <div class="col-card-name">${esc(phase.name)}</div>
          ${phase.startDate || phase.endDate
            ? `<div class="col-card-dates">${fmtDate(phase.startDate)} – ${fmtDate(phase.endDate)}</div>`
            : ''}
          ${phase.description ? `<p class="col-card-desc">${esc(phase.description)}</p>` : ''}
          ${buildMilestoneChips(phase)}
        </div>`).join('');

      return `
        <div class="col-column">
          <div class="col-header" style="border-top:3px solid ${t.primary}">
            <span class="col-quarter">${slot.label}</span>
          </div>
          <div class="col-body">${cards || '<p class="col-empty">—</p>'}</div>
        </div>`;
    }).join('');

    return `
      <section class="col-wrap">
        <div class="col-grid">${columns || '<p class="empty-msg">No phases defined yet.</p>'}</div>
      </section>`;
  }

  // ── Style: vertical ───────────────────────────────────────────────────────
  // Alternating left-right stepper with a centre spine.
  function renderVertical() {
    if (!enrichedPhases.length) {
      return `<section class="vt-wrap"><p class="empty-msg">No phases defined yet.</p></section>`;
    }

    const items = enrichedPhases.map((phase, i) => {
      const side = i % 2 === 0 ? 'vt-left' : 'vt-right';
      const chips = buildMilestoneChips(phase);
      return `
        <div class="vt-item ${side}">
          <div class="vt-card" style="border-top:3px solid ${phase.color}">
            <div class="vt-card-name" style="color:${phase.color}">${esc(phase.name)}</div>
            ${phase.startDate || phase.endDate
              ? `<div class="vt-card-dates">${fmtDate(phase.startDate)}${phase.endDate ? ' → ' + fmtDate(phase.endDate) : ''}</div>`
              : ''}
            ${phase.description ? `<p class="vt-card-desc">${esc(phase.description)}</p>` : ''}
            ${chips ? `<div class="vt-milestones">${chips}</div>` : ''}
          </div>
          <div class="vt-node-wrap">
            <div class="vt-node" style="background:${phase.color};box-shadow:0 0 0 5px ${t.bg}"></div>
          </div>
          <div class="vt-spacer"></div>
        </div>`;
    }).join('');

    return `
      <section class="vt-wrap">
        <div class="vt-timeline">
          <div class="vt-spine" style="background:${t.border}"></div>
          ${items}
        </div>
      </section>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const body = style === 'columns'  ? renderColumns()  :
               style === 'vertical' ? renderVertical() :
               renderTimeline();

  const styleLabelMap = { timeline: 'Timeline', columns: 'Quarterly Columns', vertical: 'Vertical Roadmap' };
  const styleLabel    = styleLabelMap[style] || 'Timeline';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(projectName)} — Roadmap</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${t.bg}; color: ${t.text}; line-height: 1.6; min-height: 100vh;
    }

    /* ── Header ────────────────────────────────────── */
    .rm-header {
      background: ${t.headerGrad}; color: #fff;
      padding: 3.5rem 2rem 3rem; text-align: center;
    }
    .rm-header h1 {
      font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800;
      letter-spacing: -0.5px; line-height: 1.2;
    }
    .rm-header .rm-subtitle {
      margin-top: .6rem; font-size: 1.05rem; opacity: .85;
      max-width: 600px; margin-left: auto; margin-right: auto;
    }
    .rm-meta {
      display: flex; justify-content: center; flex-wrap: wrap;
      gap: 1.25rem; margin-top: 2rem;
    }
    .rm-meta-pill {
      background: rgba(255,255,255,.15); backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,.25); border-radius: 999px;
      padding: .35rem 1rem; font-size: .8rem; font-weight: 500;
      display: flex; align-items: center; gap: .4rem;
    }

    /* ── Content ────────────────────────────────────── */
    .rm-content { max-width: 1200px; margin: 0 auto; padding: 2.5rem 2rem; }
    .section-label {
      font-size: .7rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: ${t.textMuted};
      margin-bottom: 1.25rem; display: flex; align-items: center; gap: .6rem;
    }
    .section-label::after {
      content: ''; flex: 1; height: 1px; background: ${t.border};
    }
    .empty-msg { color: ${t.textMuted}; font-style: italic; font-size: .9rem; }

    /* ── Milestone chips (shared) ───────────────────── */
    .ms-chip {
      display: flex; align-items: baseline; gap: .4rem; flex-wrap: wrap;
      padding: .3rem 0; border-top: 1px solid ${t.border};
      font-size: .78rem;
    }
    .ms-chip:first-child { border-top: none; }
    .ms-diamond {
      display: inline-block; width: 7px; height: 7px; flex-shrink: 0;
      clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%);
    }
    .ms-chip-name { font-weight: 600; color: ${t.text}; }
    .ms-chip-date { color: ${t.textMuted}; }
    .ms-chip-who  { font-weight: 600; font-size: .72rem; }

    /* ── Timeline style ─────────────────────────────── */
    .tl-wrap { margin-bottom: 2.5rem; }
    .tl-phases { display: flex; gap: 0; align-items: stretch; min-height: 220px; }
    .tl-phase {
      display: flex; flex-direction: column; min-width: 0;
      position: relative;
    }
    .tl-phase-inner {
      flex: 1; background: ${t.cardBg}; border: 1px solid ${t.border};
      border-radius: 10px; margin: 0 4px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      transition: box-shadow .2s;
    }
    .tl-phase-inner:hover { box-shadow: 0 4px 16px rgba(0,0,0,.12); }
    .tl-phase-accent { height: 4px; }
    .tl-phase-body { padding: 1rem 1.1rem 1.1rem; }
    .tl-phase-name { font-size: .92rem; font-weight: 700; color: ${t.text}; margin-bottom: .2rem; }
    .tl-phase-dates { font-size: .72rem; color: ${t.textMuted}; font-weight: 500; margin-bottom: .6rem; }
    .tl-phase-desc { font-size: .8rem; color: ${t.textMuted}; margin-bottom: .75rem; line-height: 1.5; }
    .tl-milestones { margin-top: .6rem; }
    .tl-phase-connector {
      display: flex; justify-content: center; padding: 4px 0;
    }
    .tl-connector-dot {
      width: 12px; height: 12px; border-radius: 50%;
      box-shadow: 0 0 0 3px ${t.bg};
    }
    .tl-axis { position: relative; padding: 0 4px; margin-top: 0; }
    .tl-axis-spine {
      height: 2px; background: ${t.border}; border-radius: 1px; margin-bottom: .6rem;
    }
    .tl-axis-marks { position: relative; height: 1.2rem; }
    .tl-axis-mark {
      position: absolute; transform: translateX(-50%);
      font-size: .68rem; color: ${t.textMuted}; font-weight: 500; white-space: nowrap;
    }
    .tl-axis-endpoints {
      display: flex; justify-content: space-between;
      font-size: .72rem; color: ${t.textMuted}; font-weight: 500; margin-top: .4rem;
    }

    /* ── Columns style ──────────────────────────────── */
    .col-wrap { margin-bottom: 2.5rem; }
    .col-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
      align-items: start;
    }
    .col-column { display: flex; flex-direction: column; gap: .85rem; }
    .col-header {
      background: ${t.cardBg}; border: 1px solid ${t.border};
      border-radius: 8px; padding: .65rem 1rem;
    }
    .col-quarter {
      font-size: .75rem; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; color: ${t.textMuted};
    }
    .col-card {
      background: ${t.cardBg}; border: 1px solid ${t.border};
      border-radius: 10px; padding: 1rem 1.1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .col-card-name { font-size: .9rem; font-weight: 700; color: ${t.text}; margin-bottom: .2rem; }
    .col-card-dates { font-size: .71rem; color: ${t.textMuted}; margin-bottom: .55rem; font-weight: 500; }
    .col-card-desc { font-size: .8rem; color: ${t.textMuted}; margin-bottom: .6rem; line-height: 1.5; }
    .col-empty { font-size: .82rem; color: ${t.textMuted}; font-style: italic; padding: .5rem 0; }

    /* ── Vertical style ─────────────────────────────── */
    .vt-wrap { margin-bottom: 2.5rem; }
    .vt-timeline { position: relative; max-width: 860px; margin: 0 auto; }
    .vt-spine {
      position: absolute; left: 50%; top: 16px; bottom: 0;
      width: 2px; transform: translateX(-50%); z-index: 0;
    }
    .vt-item {
      display: flex; align-items: flex-start; margin-bottom: 2.5rem;
      position: relative; z-index: 1;
    }
    .vt-left  { flex-direction: row; }
    .vt-right { flex-direction: row-reverse; }
    .vt-card {
      flex: 1; background: ${t.cardBg}; border-radius: 12px;
      padding: 1.25rem 1.4rem; border: 1px solid ${t.border};
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
    }
    .vt-left  .vt-card { margin-right: 2rem; }
    .vt-right .vt-card { margin-left: 2rem; }
    .vt-card-name  { font-size: 1rem; font-weight: 700; margin-bottom: .3rem; }
    .vt-card-dates { font-size: .78rem; color: ${t.textMuted}; margin-bottom: .5rem; font-weight: 500; }
    .vt-card-desc  { font-size: .84rem; color: ${t.textMuted}; margin-bottom: .75rem; line-height: 1.5; }
    .vt-milestones { margin-top: .5rem; }
    .vt-node-wrap  { display: flex; justify-content: center; align-items: flex-start; width: 40px; flex-shrink: 0; padding-top: 1.25rem; }
    .vt-node {
      width: 18px; height: 18px; border-radius: 50%;
      position: relative; z-index: 2; flex-shrink: 0;
    }
    .vt-spacer { flex: 1; }

    /* ── Team ───────────────────────────────────────── */
    .team-section {
      background: ${t.cardBg}; border: 1px solid ${t.border};
      border-radius: 12px; padding: 1.5rem 1.75rem; margin-bottom: 2rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }
    .team-grid { display: flex; flex-wrap: wrap; gap: .85rem; }
    .team-chip {
      display: flex; align-items: center; gap: .7rem;
      background: ${t.accentLight}; border: 1px solid ${t.border};
      border-radius: 10px; padding: .6rem .9rem;
    }
    .team-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: .82rem; flex-shrink: 0;
    }
    .team-name { font-size: .88rem; font-weight: 600; color: ${t.text}; }
    .team-role { font-size: .73rem; color: ${t.textMuted}; margin-top: .05rem; }

    /* ── Footer ─────────────────────────────────────── */
    .rm-footer {
      text-align: center; padding: 1.5rem 2rem;
      font-size: .75rem; color: ${t.textMuted};
      border-top: 1px solid ${t.border}; margin-top: 1rem;
    }

    @media (max-width: 640px) {
      .tl-phases { flex-direction: column; }
      .tl-phase { margin-bottom: .75rem; }
      .tl-phase-inner { margin: 0; }
      .tl-axis { display: none; }
      .vt-spine { display: none; }
      .vt-item, .vt-right { flex-direction: column; }
      .vt-left .vt-card, .vt-right .vt-card { margin: 0 0 .5rem 0; }
      .vt-node-wrap, .vt-spacer { display: none; }
    }
    @media print {
      body { background: #fff; }
      .tl-phase-inner, .col-card, .vt-card, .team-section { box-shadow: none; }
    }
  </style>
</head>
<body>
  <header class="rm-header">
    <h1>${esc(projectName)}</h1>
    ${description ? `<p class="rm-subtitle">${esc(description)}</p>` : ''}
    <div class="rm-meta">
      ${startDate ? `<span class="rm-meta-pill">📅 ${fmtMonthYear(startDate)}</span>` : ''}
      ${endDate   ? `<span class="rm-meta-pill">🏁 ${fmtMonthYear(endDate)}</span>` : ''}
      ${phases.length ? `<span class="rm-meta-pill">📌 ${phases.length} phase${phases.length !== 1 ? 's' : ''}</span>` : ''}
      ${teamMembers.length ? `<span class="rm-meta-pill">👥 ${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}</span>` : ''}
      <span class="rm-meta-pill">🗂 ${styleLabel}</span>
    </div>
  </header>

  <div class="rm-content">
    <h2 class="section-label">Roadmap</h2>
    ${body}
    ${buildTeamSection()}
  </div>

  <footer class="rm-footer">
    Generated by <strong>Projor</strong> &middot; ${new Date().toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
  </footer>
</body>
</html>`;
}

/** Returns true if dateStr produces a valid Date */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/** Escape HTML special characters */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

module.exports = { generateRoadmapHTML };
