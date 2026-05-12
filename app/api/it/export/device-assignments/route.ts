import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const month = searchParams.get('month') // YYYY-MM

    if (!customerId || !month) {
      return NextResponse.json({ error: 'customerId und month erforderlich' }, { status: 400 })
    }

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
    const computers = await db.computer.findMany({
      where: {
        customerId,
        isActive: true,
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

    const fontSize = 10
    const fontSizeSmall = 8
    const lineHeight = 16
    const margin = 50

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

    // ===== HEADER =====
    page.drawText('IT-Geraetezuweisungen', {
      x: margin,
      y: yPosition,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    yPosition -= 35

    // ===== CUSTOMER INFO =====
    page.drawText('Kundeninformationen', {
      x: margin,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.5

    // Customer name
    const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`
    page.drawText(`Kunde: ${customerName}`, {
      x: margin,
      y: yPosition,
      size: 12,
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
    yPosition -= lineHeight * 1.5

    // Period
    page.drawText(`Zeitraum: ${monthName} ${year}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font,
    })
    yPosition -= lineHeight * 2

    // ===== CONTACTS LIST =====
    page.drawText('Eingepflegte Kontakte', {
      x: margin,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.2

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
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.5

    // Table header
    const colWidths = {
      geraet: 140,
      typ: 60,
      kontakt: 120,
      details: 175,
    }

    let xPos = margin
    page.drawText('Geraet', { x: xPos, y: yPosition, size: fontSize, font: fontBold })
    xPos += colWidths.geraet
    page.drawText('Typ', { x: xPos, y: yPosition, size: fontSize, font: fontBold })
    xPos += colWidths.typ
    page.drawText('Zugewiesen an', { x: xPos, y: yPosition, size: fontSize, font: fontBold })
    xPos += colWidths.kontakt
    page.drawText('Details', { x: xPos, y: yPosition, size: fontSize, font: fontBold })
    yPosition -= lineHeight * 0.8

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
        // Device name
        const deviceName = computer.name.length > 22 ? computer.name.substring(0, 20) + '...' : computer.name
        page.drawText(deviceName, { x: xPos, y: yPosition, size: fontSizeSmall, font })
        xPos += colWidths.geraet
        
        // Type
        page.drawText(computer.type || '-', { x: xPos, y: yPosition, size: fontSizeSmall, font })
        xPos += colWidths.typ
        
        // Contact
        const contactName = computer.contact 
          ? `${computer.contact.firstName} ${computer.contact.lastName}`
          : 'Nicht zugewiesen'
        const displayContact = contactName.length > 18 ? contactName.substring(0, 16) + '...' : contactName
        page.drawText(displayContact, { 
          x: xPos, 
          y: yPosition, 
          size: fontSizeSmall, 
          font,
          color: computer.contact ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5),
        })
        xPos += colWidths.kontakt
        
        // Details (manufacturer + model)
        const details = [computer.manufacturer, computer.model].filter(Boolean).join(' ')
        const displayDetails = details.length > 28 ? details.substring(0, 26) + '...' : (details || '-')
        page.drawText(displayDetails, { x: xPos, y: yPosition, size: fontSizeSmall, font, color: rgb(0.4, 0.4, 0.4) })
        
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
    yPosition -= lineHeight * 1.5

    page.drawText(`Aenderungen im ${monthName} ${year}`, {
      x: margin,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 1.5

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
          x: margin + 100,
          y: yPosition,
          size: fontSizeSmall,
          font,
        })
        yPosition -= lineHeight * 0.8
        
        // Details
        if (change.details) {
          const detailsText = change.details.length > 80 
            ? change.details.substring(0, 78) + '...' 
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
        
        yPosition -= lineHeight * 0.3
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
      x: width - margin - 100,
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
