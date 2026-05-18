/**
 * build-admin-daily-log-export-pdf — direct PDF download for daily feeding report.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { feedingCollectedForDayDetail, type AdminDailyLogDayDetail } from '@/lib/admin-daily-log/fetch-admin-daily-log'

const MGA_GREEN: [number, number, number] = [13, 59, 46]
const MGA_GOLD: [number, number, number] = [201, 168, 76]
const CREAM_BOX: [number, number, number] = [245, 245, 240]
const ALT_ROW: [number, number, number] = [249, 246, 240]

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

function dateLabelFromYmd(selectedDate: string): string {
  const [y, m, d] = selectedDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0))
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Builds and downloads the daily feeding collection PDF for the selected day. */
export function exportAdminDailyLogPdf(detail: AdminDailyLogDayDetail): void {
  const selectedDate = detail.dateYmd
  const dayData = detail.classes
  const totalFeedingCollected = feedingCollectedForDayDetail(detail)
  const classesSubmitted = detail.classesSubmitted
  const totalClasses = detail.classesWithStudents
  const studentsPresent = Math.round(detail.totalPresent)
  const studentsAbsent = Math.round(detail.totalAbsent)

  const doc = new jsPDF() as JsPdfWithAutoTable
  const dateLabel = dateLabelFromYmd(selectedDate)

  doc.setFillColor(...MGA_GREEN)
  doc.rect(0, 0, 210, 35, 'F')

  doc.setTextColor(...MGA_GOLD)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Morning Glory Academy', 105, 14, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Daily Feeding Collection Report', 105, 22, { align: 'center' })
  doc.text(dateLabel, 105, 29, { align: 'center' })

  doc.setTextColor(...MGA_GREEN)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const summaryY = 45
  const boxes = [
    { label: 'Total Collected', value: `GHS ${totalFeedingCollected.toFixed(2)}` },
    { label: 'Classes Submitted', value: `${classesSubmitted} / ${totalClasses}` },
    { label: 'Students Present', value: String(studentsPresent) },
    { label: 'Students Absent', value: String(studentsAbsent) },
  ]

  boxes.forEach((box, i) => {
    const x = 10 + i * 48
    doc.setFillColor(...CREAM_BOX)
    doc.roundedRect(x, summaryY, 45, 22, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(box.label, x + 22.5, summaryY + 7, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MGA_GREEN)
    doc.text(box.value, x + 22.5, summaryY + 16, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  })

  const classBody = dayData.map(row => [
    row.className,
    row.teacherName || 'Not assigned',
    String(row.paid),
    String(row.credit),
    String(row.absent),
    `GHS ${Number(row.collected).toFixed(2)}`,
    row.submitted ? 'Submitted' : 'Not submitted',
  ])

  const totalRowIndex = classBody.length

  autoTable(doc, {
    startY: 75,
    head: [['Class', 'Teacher', 'Paid', 'Credit', 'Absent', 'Collected', 'Status']],
    body: [
      ...classBody,
      [
        'TOTAL',
        '',
        String(dayData.reduce((s, r) => s + r.paid, 0)),
        String(dayData.reduce((s, r) => s + r.credit, 0)),
        String(dayData.reduce((s, r) => s + r.absent, 0)),
        `GHS ${totalFeedingCollected.toFixed(2)}`,
        `${classesSubmitted}/${totalClasses} submitted`,
      ],
    ],
    headStyles: {
      fillColor: MGA_GREEN,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: ALT_ROW,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      5: { textColor: MGA_GOLD, fontStyle: 'bold' },
      6: { fontStyle: 'bold' },
    },
    didParseCell: data => {
      if (data.column.index === 6 && data.section === 'body') {
        const raw = String(data.cell.raw ?? '')
        if (raw === 'Not submitted') {
          data.cell.styles.textColor = [220, 38, 38]
        } else if (raw === 'Submitted') {
          data.cell.styles.textColor = [22, 163, 74]
        }
      }
      if (data.row.index === totalRowIndex && data.section === 'body') {
        data.cell.styles.fillColor = MGA_GREEN
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const finalY = (doc.lastAutoTable?.finalY ?? 75) + 20

  doc.setDrawColor(...MGA_GREEN)
  doc.line(15, finalY + 20, 85, finalY + 20)
  doc.line(120, finalY + 20, 195, finalY + 20)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Headmaster / Headmistress', 50, finalY + 26, { align: 'center' })
  doc.text('Proprietress', 157, finalY + 26, { align: 'center' })

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated by SchoolPay • ${new Date().toLocaleString('en-GB')}`,
    105,
    285,
    { align: 'center' }
  )

  doc.save(`MGA-Daily-Report-${selectedDate}.pdf`)
}
