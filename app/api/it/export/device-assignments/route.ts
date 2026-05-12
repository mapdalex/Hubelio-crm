import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'

// Alle verfuegbaren Spalten mit Labels
const COLUMN_CONFIG: Record<string, { label: string; minWidth: number }> = {
  name: { label: 'Geraet', minWidth: 60 },
  type: { label: 'Typ', minWidth: 40 },
  contact: { label: 'Zugewiesen an', minWidth: 60 },
  manufacturer: { label: 'Hersteller', minWidth: 50 },
  model: { label: 'Modell', minWidth: 50 },
  serialNumber: { label: 'Seriennummer', minWidth: 60 },
  operatingSystem: { label: 'Betriebssystem', minWidth: 60 },
  processor: { label: 'Prozessor', minWidth: 50 },
  ram: { label: 'RAM', minWidth: 30 },
  storage: { label: 'Speicher', minWidth: 40 },
  ipAddress: { label: 'IP-Adresse', minWidth: 50 },
  macAddress: { label: 'MAC-Adresse', minWidth: 70 },
  purchaseDate: { label: 'Kaufdatum', minWidth: 50 },
  warrantyUntil: { label: 'Garantie bis', minWidth: 50 },
  notes: { label: 'Notizen', minWidth: 60 },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Computer = any

// Hilfsfunktion um Textbreite zu berechnen (approximiert)
function getTextWidth(text: string, fontSize: number, font: PDFFont): number {
  try {
    return font.widthOfTextAtSize(text, fontSize)
  } catch {
    // Fallback: grobe Schaetzung
    return text.length * fontSize * 0.5
  }
}

// Hilfsfunktion um Spaltenwert zu holen
function getColumnValue(computer: Computer, columnId: string): string {
  switch (columnId) {
    case 'name':
      return computer.name || '-'
    case 'type':
      return computer.type || '-'
    case 'contact':
      return computer.contact 
        ? `${computer.contact.firstName} ${computer.contact.lastName}`
        : '-'
    case 'manufacturer':
      return computer.manufacturer || '-'
    case 'model':
      return computer.model || '-'
    case 'serialNumber':
      return computer.serialNumber || '-'
    case 'operatingSystem':
      return computer.operatingSystem || '-'
    case 'processor':
      return computer.processor || '-'
    case 'ram':
      return computer.ram || '-'
    case 'storage':
      return computer.storage || '-'
    case 'ipAddress':
      return computer.ipAddress || '-'
    case 'macAddress':
      return computer.macAddress || '-'
    case 'purchaseDate':
      return computer.purchaseDate 
        ? new Date(computer.purchaseDate).toLocaleDateString('de-DE')
        : '-'
    case 'warrantyUntil':
      return computer.warrantyUntil 
        ? new Date(computer.warrantyUntil).toLocaleDateString('de-DE')
        : '-'
    case 'notes':
      return computer.notes || '-'
    default:
      return '-'
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const month = searchParams.get('month') // YYYY-MM
    const columnsParam = searchParams.get('columns') // comma-separated column ids
    const contactId = searchParams.get('contactId') // optional - filter by contact

    if (!customerId || !month) {
      return NextResponse.json({ error: 'customerId und month erforderlich' }, { status: 400 })
    }
    
    // Kontaktfilter: "all" oder leer bedeutet kein Filter
    const filterByContact = contactId && contactId !== 'all' ? contactId : null

    // Parse columns - default to name, type, contact if not specified
    const selectedColumns = columnsParam 
      ? columnsParam.split(',').filter(col => col in COLUMN_CONFIG)
      : ['name', 'type', 'contact']

    // Parse month parameter
    const [year, monthStr] = month.split('-')
    const monthNumber = parseInt(monthStr)
    const yearNumber = parseInt(year)
    const startDate = new Date(yearNumber, monthNumber - 1, 1)
    const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59, 999)

    // Get customer data
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    // Get all computers for this customer with contact assignments
    // Optional: Filter by specific contact
    const computers = await db.computer.findMany({
      where: {
        customerId,
        isActive: true,
        ...(filterByContact && { contactId: filterByContact }),
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            email: true,
          },
        },
      },
      orderBy: [{ contact: { lastName: 'asc' } }, { name: 'asc' }],
    })

    // Get activity logs for device assignment changes in the selected month
    const activityLogs = await db.activityLog.findMany({
      where: {
        entity: 'Computer',
        action: { in: ['CREATE', 'UPDATE'] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        entityId: {
          in: computers.map(c => c.id),
        },
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter activity logs for assignment changes
    const assignmentChanges = activityLogs.filter(log => 
      log.details?.includes('Kontaktzuweisung') || 
      log.action === 'CREATE'
    )

    // Month names in German
    const monthNames = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    const monthName = monthNames[monthNumber - 1]

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()
    let yPosition = height - 50

    const fontSize = 9
    const fontSizeSmall = 8
    const lineHeight = 14
    const margin = 40
    const contentWidth = width - (margin * 2)

    // Helper function to add a new page
    const addNewPage = () => {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
      return page
    }

    // Helper function to check if we need a new page
    const checkNewPage = (neededSpace: number) => {
      if (yPosition < margin + neededSpace) {
        addNewPage()
      }
    }

    // Dynamische Spaltenbreiten berechnen
    const calculateColumnWidths = () => {
      const colWidths: Record<string, number> = {}
      const padding = 8

      for (const colId of selectedColumns) {
        const config = COLUMN_CONFIG[colId]
        // Start mit Header-Breite
        let maxWidth = getTextWidth(config.label, fontSize, fontBold) + padding

        // Maximale Breite ueber alle Daten berechnen
        for (const computer of computers) {
          const value = getColumnValue(computer, colId)
          const valueWidth = getTextWidth(value, fontSizeSmall, font) + padding
          maxWidth = Math.max(maxWidth, valueWidth, config.minWidth)
        }

        // Maximale Breite begrenzen (max 35% der Content-Breite pro Spalte)
        colWidths[colId] = Math.min(maxWidth, contentWidth * 0.35)
      }

      // Gesamtbreite berechnen
      let totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0)
      
      // Wenn Gesamtbreite > verfuegbare Breite, proportional skalieren
      if (totalWidth > contentWidth) {
        const scale = contentWidth / totalWidth
        for (const colId of selectedColumns) {
          colWidths[colId] = Math.max(colWidths[colId] * scale, COLUMN_CONFIG[colId].minWidth)
        }
        totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0)
      }
      
      // Wenn Gesamtbreite < verfuegbare Breite, gleichmaessig verteilen
      if (totalWidth < contentWidth) {
        const extra = (contentWidth - totalWidth) / selectedColumns.length
        for (const colId of selectedColumns) {
          colWidths[colId] += extra
        }
      }

      return colWidths
    }

    const colWidths = calculateColumnWidths()

    // ===== HEADER =====
    page.drawText('IT-Geraetezuweisungen', {
      x: margin,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    yPosition -= 30

    // ===== CUSTOMER INFO =====
    page.drawText('Kundeninformationen', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.3

    // Customer name
    const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`
    page.drawText(`Kunde: ${customerName}`, {
      x: margin,
      y: yPosition,
      size: 11,
      font,
    })
    yPosition -= lineHeight

    // Customer number
    page.drawText(`Kundennummer: ${customer.customerNumber}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    yPosition -= lineHeight * 1.3

    // Period
    page.drawText(`Zeitraum: ${monthName} ${year}`, {
      x: margin,
      y: yPosition,
      size: 11,
      font,
    })
    yPosition -= lineHeight
    
    // Contact filter info (if applicable)
    if (filterByContact) {
      const filteredContact = customer.contacts.find(c => c.id === filterByContact)
      if (filteredContact) {
        page.drawText(`Gefiltert nach Kontakt: ${filteredContact.firstName} ${filteredContact.lastName}`, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.6),
        })
        yPosition -= lineHeight
      }
    }
    yPosition -= lineHeight * 0.8

    // ===== CONTACTS LIST =====
    page.drawText('Eingepflegte Kontakte', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.1

    if (customer.contacts.length === 0) {
      page.drawText('Keine Kontakte vorhanden', {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= lineHeight
    } else {
      for (const contact of customer.contacts) {
        checkNewPage(lineHeight * 2)
        const contactName = `${contact.firstName} ${contact.lastName}`
        const contactInfo = contact.position ? ` (${contact.position})` : ''
        const primaryBadge = contact.isPrimary ? ' [Hauptkontakt]' : ''
        
        page.drawText(`• ${contactName}${contactInfo}${primaryBadge}`, {
          x: margin + 10,
          y: yPosition,
          size: fontSize,
          font,
        })
        yPosition -= lineHeight
      }
    }
    yPosition -= lineHeight

    // ===== DEVICE ASSIGNMENTS TABLE =====
    checkNewPage(100)
    page.drawText('Geraetezuweisungen', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.3

    // Table header
    let xPos = margin
    for (const colId of selectedColumns) {
      const config = COLUMN_CONFIG[colId]
      page.drawText(config.label, { 
        x: xPos, 
        y: yPosition, 
        size: fontSize, 
        font: fontBold 
      })
      xPos += colWidths[colId]
    }
    yPosition -= lineHeight * 0.6

    // Draw line under header
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= lineHeight

    // Table rows
    if (computers.length === 0) {
      page.drawText('Keine aktiven Geraete vorhanden', {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= lineHeight
    } else {
      for (const computer of computers) {
        checkNewPage(lineHeight * 2)
        
        xPos = margin
        for (const colId of selectedColumns) {
          const value = getColumnValue(computer, colId)
          const colWidth = colWidths[colId]
          
          // Text kuerzen wenn noetig
          let displayValue = value
          const maxChars = Math.floor(colWidth / (fontSizeSmall * 0.55))
          if (displayValue.length > maxChars) {
            displayValue = displayValue.substring(0, maxChars - 2) + '..'
          }
          
          const textColor = (colId === 'contact' && value === '-') 
            ? rgb(0.5, 0.5, 0.5) 
            : rgb(0, 0, 0)
          
          page.drawText(displayValue, { 
            x: xPos, 
            y: yPosition, 
            size: fontSizeSmall, 
            font,
            color: textColor,
          })
          xPos += colWidth
        }
        
        yPosition -= lineHeight
      }
    }
    yPosition -= lineHeight

    // ===== CHANGES IN SELECTED MONTH =====
    checkNewPage(80)
    
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    yPosition -= lineHeight * 1.3

    page.drawText(`Aenderungen im ${monthName} ${year}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.3

    if (assignmentChanges.length === 0) {
      page.drawText('Keine Aenderungen in diesem Zeitraum', {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= lineHeight
    } else {
      for (const change of assignmentChanges) {
        checkNewPage(lineHeight * 3)
        
        const changeDate = new Date(change.createdAt).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        
        // Find computer name for this change
        const computer = computers.find(c => c.id === change.entityId)
        const computerName = computer?.name || 'Unbekanntes Geraet'
        
        // Action type
        const actionType = change.action === 'CREATE' ? 'Neu angelegt' : 'Aktualisiert'
        
        page.drawText(`${changeDate}`, {
          x: margin,
          y: yPosition,
          size: fontSizeSmall,
          font: fontBold,
          color: rgb(0.3, 0.3, 0.3),
        })
        
        page.drawText(`${computerName} - ${actionType}`, {
          x: margin + 90,
          y: yPosition,
          size: fontSizeSmall,
          font,
        })
        yPosition -= lineHeight * 0.8
        
        // Details
        if (change.details) {
          const detailsText = change.details.length > 90 
            ? change.details.substring(0, 88) + '...' 
            : change.details
          page.drawText(detailsText, {
            x: margin + 10,
            y: yPosition,
            size: fontSizeSmall - 1,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })
          yPosition -= lineHeight * 0.8
        }
        
        if (change.user?.name) {
          page.drawText(`von ${change.user.name}`, {
            x: margin + 10,
            y: yPosition,
            size: fontSizeSmall - 1,
            font,
            color: rgb(0.5, 0.5, 0.5),
          })
          yPosition -= lineHeight
        }
        
        yPosition -= lineHeight * 0.2
      }
    }

    // ===== FOOTER =====
    yPosition = margin + 20
    page.drawLine({
      start: { x: margin, y: yPosition + 10 },
      end: { x: width - margin, y: yPosition + 10 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })
    
    page.drawText(`Erstellt am: ${new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`, {
      x: margin,
      y: yPosition - 5,
      size: fontSizeSmall,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
    
    page.drawText(`Geraete gesamt: ${computers.length}`, {
      x: width - margin - 80,
      y: yPosition - 5,
      size: fontSizeSmall,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save()

    // Filename: Geraetezuweisungen_CustomerName_YYYY-MM.pdf
    const safeCustomerName = customerName
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')
      .replace(/_+/g, '_')
    const filename = `Geraetezuweisungen_${safeCustomerName}_${year}-${monthStr}.pdf`

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating device assignments PDF:', error)
    return NextResponse.json({ error: 'Fehler beim PDF-Export' }, { status: 500 })
  }
}
