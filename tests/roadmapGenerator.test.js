'use strict';

const { generateRoadmapHTML } = require('../lib/roadmapGenerator');

const SAMPLE = {
  projectName: 'Apollo',
  description: 'Land on the moon',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  theme: 'blue',
  phases: [
    {
      name: 'Phase 1: Planning',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      description: 'Requirements and specs',
      milestones: [
        { name: 'Kick-off', date: '2024-01-15', assignee: 'Alice' },
        { name: 'Spec freeze', date: '2024-03-01', assignee: 'Bob' },
      ],
    },
    {
      name: 'Phase 2: Build',
      startDate: '2024-04-01',
      endDate: '2024-09-30',
      milestones: [
        { name: 'Alpha', date: '2024-06-30', assignee: 'Carol' },
      ],
    },
  ],
  teamMembers: [
    { name: 'Alice', role: 'PM' },
    { name: 'Bob',   role: 'Engineer' },
    { name: 'Carol', role: 'Engineer' },
  ],
};

describe('generateRoadmapHTML', () => {
  test('returns a string', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(typeof html).toBe('string');
  });

  test('contains the project name', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(html).toContain('Apollo');
  });

  test('contains phase names', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(html).toContain('Phase 1: Planning');
    expect(html).toContain('Phase 2: Build');
  });

  test('contains milestone names', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(html).toContain('Kick-off');
    expect(html).toContain('Spec freeze');
    expect(html).toContain('Alpha');
  });

  test('contains team member names', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
    expect(html).toContain('Carol');
  });

  test('is a valid HTML document', () => {
    const html = generateRoadmapHTML(SAMPLE);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('</html>');
  });

  test('escapes XSS in project name', () => {
    const html = generateRoadmapHTML({ ...SAMPLE, projectName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('uses the correct theme', () => {
    const htmlBlue   = generateRoadmapHTML({ ...SAMPLE, theme: 'blue' });
    const htmlGreen  = generateRoadmapHTML({ ...SAMPLE, theme: 'green' });
    // They should differ (different colour palettes)
    expect(htmlBlue).not.toBe(htmlGreen);
  });

  test('handles missing optional fields gracefully', () => {
    const html = generateRoadmapHTML({ projectName: 'Minimal', startDate: '2024-01-01', endDate: '2024-06-01' });
    expect(html).toContain('Minimal');
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });

  test('timeline style contains tl-phases', () => {
    const html = generateRoadmapHTML({ ...SAMPLE, style: 'timeline' });
    expect(html).toContain('tl-phases');
  });

  test('columns style contains col-grid', () => {
    const html = generateRoadmapHTML({ ...SAMPLE, style: 'columns' });
    expect(html).toContain('col-grid');
  });

  test('vertical style contains vt-timeline', () => {
    const html = generateRoadmapHTML({ ...SAMPLE, style: 'vertical' });
    expect(html).toContain('vt-timeline');
  });

  test('all three styles produce valid HTML', () => {
    ['timeline', 'columns', 'vertical'].forEach((style) => {
      const html = generateRoadmapHTML({ ...SAMPLE, style });
      expect(html).toMatch(/^<!DOCTYPE html>/i);
      expect(html).toContain('</html>');
    });
  });

  test('style label appears in meta pills', () => {
    const htmlColumns  = generateRoadmapHTML({ ...SAMPLE, style: 'columns' });
    const htmlTimeline = generateRoadmapHTML({ ...SAMPLE, style: 'timeline' });
    const htmlVertical = generateRoadmapHTML({ ...SAMPLE, style: 'vertical' });
    expect(htmlColumns).toContain('Quarterly Columns');
    expect(htmlTimeline).toContain('Timeline');
    expect(htmlVertical).toContain('Vertical Roadmap');
  });

  test('handles invalid date strings gracefully', () => {
    const html = generateRoadmapHTML({
      ...SAMPLE,
      startDate: 'not-a-date',
      endDate: 'also-invalid',
    });
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('Apollo');
  });
});
