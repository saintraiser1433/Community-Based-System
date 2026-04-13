import { jsPDF } from 'jspdf'
import { formatMswdoId } from '@/lib/mswdo-id'

export interface IdCardData {
  id: string
  firstName: string
  lastName: string
  role: string
  barangayName?: string | null
  /** For RESIDENT: public ID (MSWDO-0001); shown on card when set */
  mswdoSequence?: number | null
  /** For RESIDENT only: must be true (approved / active) to generate an ID card */
  isActive?: boolean
}

function roleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'System Administrator'
    case 'BARANGAY':
      return 'Barangay Manager'
    case 'RESIDENT':
      return 'Resident'
    default:
      return role
  }
}

/** Residents must be approved (active) before an ID card can be generated. */
export function canGenerateIdCard(role: string, isActive: boolean): boolean {
  if (role !== 'RESIDENT') return true
  return isActive === true
}

async function loadGlanLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL('/glanlogos.png', window.location.origin).href
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * CR80-style card in landscape: 86mm wide × 54mm tall.
 * jsPDF swaps dimensions when orientation is "landscape", so we pass [54, 86] to get a final page of 86×54.
 */
export async function downloadUserIdCardPdf(data: IdCardData): Promise<void> {
  if (data.role === 'RESIDENT' && data.isActive !== true) {
    throw new Error('ID cards can only be generated for approved (active) residents.')
  }

  const cardW = 86
  const cardH = 54

  const pdf = new jsPDF({
    unit: 'mm',
    format: [cardH, cardW],
    orientation: 'landscape'
  })

  const logoSize = 7
  const logoX = 2.5
  const logoY = 2
  const textStartX = logoX + logoSize + 2
  const headerTextMaxW = cardW - textStartX - 3

  // Outer border
  pdf.setDrawColor(225, 29, 72)
  pdf.setLineWidth(0.5)
  pdf.rect(1, 1, cardW - 2, cardH - 2, 'S')

  // Header strip (full width, top)
  pdf.setFillColor(252, 231, 243)
  pdf.rect(1, 1, cardW - 2, 10, 'F')
  pdf.setDrawColor(225, 29, 72)
  pdf.line(1, 11, cardW - 1, 11)

  const logoData = await loadGlanLogoDataUrl()
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize)
    } catch {
      // Invalid image data — continue without logo
    }
  }

  pdf.setTextColor(131, 24, 67)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('MSWDO-GLAN CBDS', textStartX, 5.5)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  const subLines = pdf.splitTextToSize(
    'Community-Based Donation System — ID Card',
    headerTextMaxW
  )
  pdf.text(subLines, textStartX, 8.5)

  // Body: photo left, details right (landscape row)
  const bodyTop = 13
  const photoW = 24
  const photoH = 30
  const gutter = 3
  const colX = 3 + photoW + gutter
  const textMaxW = cardW - colX - 3

  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.35)
  pdf.rect(3, bodyTop, photoW, photoH, 'S')
  pdf.setTextColor(148, 163, 184)
  pdf.setFontSize(7)
  pdf.text('Photo', 3 + photoW / 2, bodyTop + photoH / 2 - 2, { align: 'center' })
  pdf.setFontSize(6)
  pdf.text('(blank)', 3 + photoW / 2, bodyTop + photoH / 2 + 2, { align: 'center' })

  let y = bodyTop + 5

  pdf.setTextColor(17, 24, 39)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  const fullName = `${data.firstName} ${data.lastName}`.trim()
  const nameLines = pdf.splitTextToSize(fullName, textMaxW)
  pdf.text(nameLines, colX, y)
  y += nameLines.length * 4.5 + 2

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(100, 116, 139)
  const roleText = `Role: ${roleLabel(data.role)}`
  const roleLines = pdf.splitTextToSize(roleText, textMaxW)
  pdf.text(roleLines, colX, y)
  y += roleLines.length * 3.8

  if (data.barangayName && data.barangayName.trim() !== '') {
    const bLines = pdf.splitTextToSize(`Barangay: ${data.barangayName}`, textMaxW)
    pdf.text(bLines, colX, y)
    y += bLines.length * 3.8
  }

  pdf.setFontSize(6.5)
  pdf.setTextColor(148, 163, 184)
  const idDisplay = data.mswdoSequence != null ? formatMswdoId(data.mswdoSequence) : data.id
  const idLines = pdf.splitTextToSize(`ID No.: ${idDisplay}`, textMaxW)
  pdf.text(idLines, colX, y)
  y += idLines.length * 3.2

  const issued = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  pdf.text(`Issued: ${issued}`, colX, Math.min(y + 1, cardH - 3))

  const fileSlug =
    data.mswdoSequence != null
      ? formatMswdoId(data.mswdoSequence)
      : `CBDS-ID-${data.id.slice(0, 8)}`
  pdf.save(`${fileSlug}.pdf`)
}
