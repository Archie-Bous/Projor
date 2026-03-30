'use strict';

/**
 * Generates a self-contained, beautiful HTML roadmap file from a roadmap data object.
 *
 * @param {Object} data - The roadmap data
 * @param {string} data.projectName
 * @param {string} [data.description]
 * @param {string} data.startDate - ISO date string (YYYY-MM-DD)
 * @param {string} data.endDate   - ISO date string (YYYY-MM-DD)
 * @param {string} [data.theme]   - 'blue' | 'green' | 'purple' | 'orange' | 'dark'
 * @param {Array}  data.phases
 * @param {string} data.phases[].name
 * @param {string} data.phases[].startDate
 * @param {string} data.phases[].endDate
 * @param {string} [data.phases[].color]
 * @param {string} [data.phases[].description]
 * @param {Array}  [data.phases[].milestones]
 * @param {string} data.phases[].milestones[].name
 * @param {string} data.phases[].milestones[].date
 * @param {string} [data.phases[].milestones[].assignee]
 * @param {Array}  [data.teamMembers]
 * @returns {string} Self-contained HTML string
 */
function generateRoadmapHTML(data) {
  const {
    projectName = 'Untitled Project',
    description = '',
    startDate,
    endDate,
    theme = 'blue',
    phases = [],
    teamMembers = [],
  } = data;

  const THEMES = {
    blue:   { primary: '#1e40af', secondary: '#3b82f6', light: '#dbeafe', bg: '#f8faff', headerBg: '#1e3a8a', text: '#1e3a5f', phaseColors: ['#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a'] },
    green:  { primary: '#166534', secondary: '#16a34a', light: '#dcfce7', bg: '#f0fdf4', headerBg: '#14532d', text: '#14532d', phaseColors: ['#16a34a','#15803d','#166534','#22c55e','#4ade80'] },
    purple: { primary: '#6b21a8', secondary: '#9333ea', light: '#f3e8ff', bg: '#faf5ff', headerBg: '#581c87', text: '#4a1772', phaseColors: ['#9333ea','#7c3aed','#6d28d9','#5b21b6','#4c1d95'] },
    orange: { primary: '#9a3412', secondary: '#ea580c', light: '#ffedd5', bg: '#fff7ed', headerBg: '#7c2d12', text: '#7c2d12', phaseColors: ['#ea580c','#dc2626','#f97316','#ef4444','#c2410c'] },
    dark:   { primary: '#111827', secondary: '#374151', light: '#374151', bg: '#1f2937', headerBg: '#030712', text: '#f9fafb', phaseColors: ['#6b7280','#4b5563','#374151','#9ca3af','#d1d5db'] },
  };

  const t = THEMES[theme] || THEMES.blue;

  const start = startDate ? new Date(startDate) : new Date();
  const end   = endDate   ? new Date(endDate)   : addMonths(start, 6);
  const totalMs = end - start;

  // Clamp a date within [start, end] and return [0..100]%
  function pct(dateStr) {
    const d = new Date(dateStr);
    if (d <= start) return 0;
    if (d >= end)   return 100;
    return ((d - start) / totalMs) * 100;
  }

  // Build month-header labels
  const months = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  function monthLabel(d) {
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Assign phase colours
  const phaseColors = t.phaseColors;
  const enrichedPhases = phases.map((p, i) => ({
    ...p,
    color: p.color || phaseColors[i % phaseColors.length],
  }));

  // Build Gantt rows HTML
  const ganttRows = enrichedPhases.map((phase) => {
    const left  = pct(phase.startDate || startDate);
    const right = pct(phase.endDate   || endDate);
    const width = Math.max(right - left, 1);

    // Milestone diamonds on the bar
    const milestoneDiamonds = (phase.milestones || []).map((m) => {
      const mp = pct(m.date);
      if (mp < left || mp > right) return '';
      const relPct = ((mp - left) / width) * 100;
      return `<div class="milestone-diamond" style="left:${relPct.toFixed(2)}%" title="${esc(m.name)}${m.assignee ? ' — ' + m.assignee : ''}"></div>`;
    }).join('');

    return `
      <div class="gantt-row">
        <div class="gantt-label">${esc(phase.name)}</div>
        <div class="gantt-bar-track">
          <div class="gantt-bar" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;background:${phase.color};">
            <span class="gantt-bar-text">${esc(phase.name)}</span>
            ${milestoneDiamonds}
          </div>
        </div>
      </div>`;
  }).join('');

  // Build month header HTML
  const monthHeaders = months.map((m) => {
    const mp = pct(m.toISOString().slice(0, 10));
    return `<div class="month-tick" style="left:${mp.toFixed(2)}%">${monthLabel(m)}</div>`;
  }).join('');

  // Phase detail cards
  const phaseCards = enrichedPhases.map((phase) => {
    const milestoneList = (phase.milestones || []).map((m) => `
      <li class="milestone-item">
        <span class="milestone-dot" style="background:${phase.color}"></span>
        <div class="milestone-info">
          <span class="milestone-name">${esc(m.name)}</span>
          ${m.date ? `<span class="milestone-date">${fmtDate(m.date)}</span>` : ''}
          ${m.assignee ? `<span class="milestone-assignee">${esc(m.assignee)}</span>` : ''}
        </div>
      </li>`).join('');

    return `
      <div class="phase-card" style="border-top:4px solid ${phase.color};">
        <div class="phase-card-header">
          <div class="phase-dot" style="background:${phase.color}"></div>
          <h3 class="phase-name">${esc(phase.name)}</h3>
        </div>
        ${phase.startDate || phase.endDate ? `<p class="phase-dates">${fmtDate(phase.startDate)}${phase.startDate && phase.endDate ? ' → ' : ''}${fmtDate(phase.endDate)}</p>` : ''}
        ${phase.description ? `<p class="phase-description">${esc(phase.description)}</p>` : ''}
        ${milestoneList ? `<ul class="milestone-list">${milestoneList}</ul>` : ''}
      </div>`;
  }).join('');

  // Team members section
  const teamSection = teamMembers.length > 0 ? `
    <section class="team-section">
      <h2 class="section-title">Team</h2>
      <div class="team-grid">
        ${teamMembers.map((m) => {
          const name = typeof m === 'string' ? m : m.name;
          const role = typeof m === 'object' ? m.role || '' : '';
          const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          return `<div class="team-card">
            <div class="avatar" style="background:${t.secondary}">${initials}</div>
            <div class="team-info">
              <span class="team-name">${esc(name)}</span>
              ${role ? `<span class="team-role">${esc(role)}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>` : '';

  const isDark = theme === 'dark';
  const cardBg  = isDark ? '#111827' : '#ffffff';
  const bodyBg  = isDark ? '#1f2937' : '#f1f5f9';
  const borderC = isDark ? '#374151' : '#e2e8f0';
  const labelC  = isDark ? '#d1d5db' : '#475569';
  const mileDateC = isDark ? '#9ca3af' : '#64748b';

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
      background: ${bodyBg};
      color: ${t.text};
      line-height: 1.6;
    }
    /* ── Header ── */
    .roadmap-header {
      background: linear-gradient(135deg, ${t.headerBg} 0%, ${t.secondary} 100%);
      color: #fff;
      padding: 3rem 2rem 2.5rem;
      text-align: center;
    }
    .roadmap-header h1 { font-size: 2.4rem; font-weight: 800; letter-spacing: -0.5px; }
    .roadmap-header .subtitle { margin-top: .5rem; font-size: 1.1rem; opacity: .85; max-width: 640px; margin-left: auto; margin-right: auto; }
    .roadmap-header .meta { display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; font-size: .85rem; opacity: .7; flex-wrap: wrap; }
    .roadmap-header .meta span { display: flex; align-items: center; gap: .35rem; }
    /* ── Layout ── */
    .content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
    .section-title { font-size: 1.25rem; font-weight: 700; color: ${t.primary}; margin-bottom: 1.25rem; padding-bottom: .5rem; border-bottom: 2px solid ${t.light}; }
    /* ── Gantt ── */
    .gantt-section { background: ${cardBg}; border-radius: 12px; padding: 1.75rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); border: 1px solid ${borderC}; }
    .gantt-timeline { position: relative; margin-bottom: 1.5rem; height: 24px; }
    .month-tick {
      position: absolute; top: 0; font-size: .7rem; color: ${mileDateC};
      transform: translateX(-50%); white-space: nowrap;
    }
    .gantt-row { display: flex; align-items: center; gap: 1rem; margin-bottom: .65rem; }
    .gantt-label { width: 160px; min-width: 160px; font-size: .8rem; font-weight: 600; color: ${labelC}; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gantt-bar-track { flex: 1; position: relative; height: 32px; background: ${isDark ? '#374151' : '#f1f5f9'}; border-radius: 6px; overflow: visible; }
    .gantt-bar {
      position: absolute; top: 0; height: 100%; border-radius: 6px;
      display: flex; align-items: center; overflow: hidden;
      transition: filter .2s; cursor: default;
    }
    .gantt-bar:hover { filter: brightness(1.1); }
    .gantt-bar-text { font-size: .72rem; font-weight: 600; color: #fff; padding: 0 .6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .milestone-diamond {
      position: absolute; top: 50%; width: 12px; height: 12px;
      background: #fff; border: 2px solid rgba(0,0,0,.3);
      transform: translateY(-50%) translateX(-50%) rotate(45deg);
      cursor: pointer;
    }
    /* ── Phase cards ── */
    .phases-section { margin-bottom: 2rem; }
    .phases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
    .phase-card { background: ${cardBg}; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); border: 1px solid ${borderC}; }
    .phase-card-header { display: flex; align-items: center; gap: .6rem; margin-bottom: .4rem; }
    .phase-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .phase-name { font-size: 1rem; font-weight: 700; color: ${t.text}; }
    .phase-dates { font-size: .78rem; color: ${mileDateC}; margin-bottom: .6rem; }
    .phase-description { font-size: .85rem; color: ${labelC}; margin-bottom: .75rem; }
    .milestone-list { list-style: none; display: flex; flex-direction: column; gap: .5rem; }
    .milestone-item { display: flex; align-items: flex-start; gap: .6rem; }
    .milestone-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: .35rem; }
    .milestone-info { display: flex; flex-direction: column; }
    .milestone-name { font-size: .85rem; font-weight: 600; color: ${t.text}; }
    .milestone-date { font-size: .75rem; color: ${mileDateC}; }
    .milestone-assignee { font-size: .72rem; color: ${t.secondary}; font-weight: 600; margin-top: .1rem; }
    /* ── Team ── */
    .team-section { background: ${cardBg}; border-radius: 12px; padding: 1.75rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); border: 1px solid ${borderC}; }
    .team-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .team-card { display: flex; align-items: center; gap: .75rem; background: ${isDark ? '#1f2937' : '#f8fafc'}; border-radius: 10px; padding: .65rem 1rem; border: 1px solid ${borderC}; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: .85rem; flex-shrink: 0; }
    .team-info { display: flex; flex-direction: column; }
    .team-name { font-size: .9rem; font-weight: 600; color: ${t.text}; }
    .team-role { font-size: .75rem; color: ${mileDateC}; }
    /* ── Footer ── */
    .roadmap-footer { text-align: center; padding: 1.5rem; font-size: .78rem; color: ${mileDateC}; border-top: 1px solid ${borderC}; margin-top: 2rem; }
    @media print {
      body { background: #fff; }
      .gantt-section, .phase-card, .team-section { box-shadow: none; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  <header class="roadmap-header">
    <h1>${esc(projectName)}</h1>
    ${description ? `<p class="subtitle">${esc(description)}</p>` : ''}
    <div class="meta">
      ${startDate ? `<span>📅 Start: ${fmtDate(startDate)}</span>` : ''}
      ${endDate   ? `<span>🏁 End: ${fmtDate(endDate)}</span>` : ''}
      ${phases.length ? `<span>📌 ${phases.length} phase${phases.length !== 1 ? 's' : ''}</span>` : ''}
      ${teamMembers.length ? `<span>👥 ${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}</span>` : ''}
    </div>
  </header>

  <div class="content">
    <!-- Gantt Chart -->
    <section class="gantt-section">
      <h2 class="section-title">Timeline</h2>
      <div class="gantt-timeline" style="position:relative;height:28px;">
        ${monthHeaders}
      </div>
      ${ganttRows}
    </section>

    <!-- Phase Detail Cards -->
    <section class="phases-section">
      <h2 class="section-title">Phases &amp; Milestones</h2>
      <div class="phases-grid">
        ${phaseCards || `<p style="color:${labelC}">No phases defined yet.</p>`}
      </div>
    </section>

    ${teamSection}
  </div>

  <footer class="roadmap-footer">
    Generated by <strong>Projor</strong> on ${new Date().toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
  </footer>
</body>
</html>`;
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
