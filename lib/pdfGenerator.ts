import { jsPDF } from 'jspdf'

export async function generateResumePdf(resumeText: string): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 50
  const maxWidth = pageWidth - margin * 2
  let y = 45

  const lines = resumeText.split('\n')
  const sectionHeaders = ['PROFESSIONAL SUMMARY', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS', 'SKILLS', 'WORK AUTHORIZATION', 'PROJECTS']

  let isFirstLine = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      y += 6
      continue
    }

    // Check if we need a new page
    if (y > 720) {
      doc.addPage()
      y = 45
    }

    // Name (first non-empty line)
    if (isFirstLine) {
      doc.setFont('helvetica', 'bold').setFontSize(16)
      doc.text(trimmed, pageWidth / 2, y, { align: 'center' })
      y += 18
      isFirstLine = false
      continue
    }

    // Contact line
    if (trimmed.includes('|') && (trimmed.includes('@') || trimmed.includes('linkedin'))) {
      doc.setFont('helvetica', 'normal').setFontSize(9)
      doc.text(trimmed, pageWidth / 2, y, { align: 'center' })
      y += 14
      continue
    }

    // Section headers
    const isSectionHeader = sectionHeaders.some(h => trimmed.startsWith(h))
    if (isSectionHeader) {
      y += 6
      doc.setFont('helvetica', 'bold').setFontSize(11)
      const headerText = trimmed.split(':')[0]
      doc.text(headerText, margin, y)
      y += 3
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10

      // Content after colon (e.g., "CERTIFICATIONS: Six Sigma Green Belt")
      const afterColon = trimmed.includes(':') ? trimmed.substring(trimmed.indexOf(':') + 1).trim() : ''
      if (afterColon) {
        doc.setFont('helvetica', 'normal').setFontSize(10)
        const wrapped = doc.splitTextToSize(afterColon, maxWidth)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 12
      }
      continue
    }

    // Job title lines (contain | separator)
    if (trimmed.includes('|') && !trimmed.startsWith('•') && !trimmed.includes('@')) {
      doc.setFont('helvetica', 'bold').setFontSize(10)
      const wrapped = doc.splitTextToSize(trimmed, maxWidth)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 12
      continue
    }

    // Bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      doc.setFont('helvetica', 'normal').setFontSize(9.5)
      const wrapped = doc.splitTextToSize(trimmed, maxWidth - 10)
      doc.text(wrapped, margin + 8, y)
      y += wrapped.length * 11
      continue
    }

    // Regular text
    doc.setFont('helvetica', 'normal').setFontSize(10)
    const wrapped = doc.splitTextToSize(trimmed, maxWidth)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 12
  }

  return Buffer.from(doc.output('arraybuffer'))
}

export async function generateCoverLetterPdf(coverLetterText: string, jobTitle: string, company: string): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 72
  const maxWidth = pageWidth - margin * 2
  let y = 72

  // Date
  doc.setFont('helvetica', 'normal').setFontSize(11)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(dateStr, margin, y)
  y += 24

  // Body
  const paragraphs = coverLetterText.split('\n').filter(l => l.trim())
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (y > 700) {
      doc.addPage()
      y = 72
    }

    doc.setFont('helvetica', 'normal').setFontSize(11)
    const wrapped = doc.splitTextToSize(trimmed, maxWidth)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 14 + 8
  }

  return Buffer.from(doc.output('arraybuffer'))
}
