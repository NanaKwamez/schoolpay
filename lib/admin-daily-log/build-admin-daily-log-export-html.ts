/**
 * build-admin-daily-log-export-html — printable HTML for one daily log snapshot.
 */

import { SCHOOL_NAME } from '@/lib/constants'
import { formatDate, formatGHS } from '@/lib/utils'

import {
  feedingCollectedForDayDetail,
  type AdminDailyLogDayDetail,
} from '@/lib/admin-daily-log/fetch-admin-daily-log'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildAdminDailyLogExportHtml(
  detail: AdminDailyLogDayDetail,
  headerLabel: string
): string {
  const rows = detail.classes
    .map(
      c => `
      <tr>
        <td>${escapeHtml(c.className)}</td>
        <td>${escapeHtml(c.teacherName)}</td>
        <td style="text-align:right">${c.paid}</td>
        <td style="text-align:right">${c.credit}</td>
        <td style="text-align:right">${c.absent}</td>
        <td style="text-align:right">${escapeHtml(formatGHS(c.collected))}</td>
        <td>${c.submitted ? 'Yes' : 'No'}</td>
      </tr>`
    )
    .join('')

  const incomeRows = detail.incomeRows
    .map(
      i => `
      <tr>
        <td>${escapeHtml(i.categoryLabel)} — ${escapeHtml(i.incomeName)}</td>
        <td style="text-align:right">${escapeHtml(formatGHS(i.amount))}</td>
        <td>${escapeHtml(i.recordedByName)}</td>
        <td>${escapeHtml(i.notes ?? '—')}</td>
      </tr>`
    )
    .join('')

  const collected = feedingCollectedForDayDetail(detail)
  const notSubmitted = detail.classesNotSubmitted

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(headerLabel)} — ${escapeHtml(SCHOOL_NAME)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #0A1628; }
    h1 { font-size: 1.25rem; margin-bottom: 4px; }
    .muted { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; }
    .card strong { display: block; font-size: 1.1rem; }
    table { width: 100%; border-collapse: collapse; margin-top:12px; font-size: 0.9rem; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #0A1628; color: white; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(headerLabel)}</h1>
  <p class="muted">${escapeHtml(SCHOOL_NAME)} · ${escapeHtml(formatDate(detail.dateYmd))}</p>
  <div class="grid">
    <div class="card"><small>Total feeding collected</small><strong>${escapeHtml(formatGHS(collected))}</strong></div>
    <div class="card"><small>Classes submitted</small><strong>${detail.classesSubmitted} / ${detail.classesWithStudents}</strong></div>
    <div class="card"><small>Classes not submitted</small><strong>${notSubmitted}</strong></div>
    <div class="card"><small>Present / absent</small><strong>${Math.round(detail.totalPresent)} / ${Math.round(detail.totalAbsent)}</strong></div>
    <div class="card"><small>Income entries</small><strong>${detail.incomeRows.length}</strong></div>
  </div>
  <h2>Class breakdown</h2>
  <table>
    <thead><tr><th>Class</th><th>Teacher</th><th>Paid</th><th>Credit</th><th>Absent</th><th>Collected</th><th>Submitted</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>Extra income</h2>
  <table>
    <thead><tr><th>Type</th><th>Amount</th><th>Recorded by</th><th>Notes</th></tr></thead>
    <tbody>${incomeRows.length ? incomeRows : '<tr><td colspan="4">No entries</td></tr>'}</tbody>
  </table>
</body>
</html>`
}
