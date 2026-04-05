import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'
import { PDFDocument, rgb } from 'pdf-lib'

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

    // Get worklogs for the month
    const [year, monthStr] = month.split('-')
    const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)

    const worklogs = await db.worklog.findMany({
      where: {
        customerId,
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
        activity: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    const customer = await db.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    // Kundenname fuer Dateiname (Sonderzeichen entfernen)
    const customerName = (customer.companyName || `${customer.firstName}_${customer.lastName}`)
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')
      .replace(/_+/g, '_')
    
    // Monatsnamen auf Deutsch
    const monthNames = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    const monthName = monthNames[parseInt(monthStr) - 1]

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([595, 842]) // A4
    const { height } = page.getSize()
    let yPosition = height - 50

    const fontSize = 10
    const lineHeight = 16

    // Header
    page.drawText('Stundenabrechnung', {
      x: 50,
      y: yPosition,
      size: 18,
      color: rgb(0, 0, 0),
    })
    yPosition -= 35

    // Customer Info
    page.drawText(`Kunde: ${customer.companyName || `${customer.firstName} ${customer.lastName}`}`, {
      x: 50,
      y: yPosition,
      size: 12,
    })
    yPosition -= lineHeight * 1.5

    page.drawText(`Zeitraum: ${monthName} ${year}`, {
      x: 50,
      y: yPosition,
      size: 12,
    })
    yPosition -= lineHeight * 2.5

    // Table Headers
    const colWidths = {
      datum: 60,
      mitarbeiter: 80,
      projekt: 80,
      taetigkeit: 80,
      beschreibung: 150,
      dauer: 50,
    }
    
    let xPos = 50
    page.drawText('Datum', { x: xPos, y: yPosition, size: fontSize })
    xPos += colWidths.datum
    page.drawText('Mitarbeiter', { x: xPos, y: yPosition, size: fontSize })
    xPos += colWidths.mitarbeiter
    page.drawText('Projekt', { x: xPos, y: yPosition, size: fontSize })
    xPos += colWidths.projekt
    page.drawText('Taetigkeit', { x: xPos, y: yPosition, size: fontSize })
    xPos += colWidths.taetigkeit
    page.drawText('Beschreibung', { x: xPos, y: yPosition, size: fontSize })
    xPos += colWidths.beschreibung
    page.drawText('Dauer', { x: xPos, y: yPosition, size: fontSize })
    yPosition -= lineHeight

    // Draw horizontal line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= lineHeight

    // Table Rows
    let totalHours = 0
    for (const log of worklogs) {
      // Check if we need a new page
      if (yPosition < 80) {
        page = pdfDoc.addPage([595, 842])
        yPosition = height - 50
      }

      const date = new Date(log.startTime).toLocaleDateString('de-DE')
      const hours = log.duration / 60
      totalHours += hours
      
      // Beschreibung kuerzen wenn zu lang
      const description = (log.description || '-').substring(0, 40)
      
      xPos = 50
      page.drawText(date, { x: xPos, y: yPosition, size: 9 })
      xPos += colWidths.datum
      page.drawText((log.user.name || '').substring(0, 12), { x: xPos, y: yPosition, size: 9 })
      xPos += colWidths.mitarbeiter
      page.drawText((log.project.name || '').substring(0, 12), { x: xPos, y: yPosition, size: 9 })
      xPos += colWidths.projekt
      page.drawText((log.activity.name || '').substring(0, 12), { x: xPos, y: yPosition, size: 9 })
      xPos += colWidths.taetigkeit
      page.drawText(description, { x: xPos, y: yPosition, size: 9 })
      xPos += colWidths.beschreibung
      page.drawText(`${hours.toFixed(2)}h`, { x: xPos, y: yPosition, size: 9 })
      
      yPosition -= lineHeight
    }

    // Total
    yPosition -= lineHeight * 0.5
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= lineHeight * 1.2
    page.drawText(`Gesamt: ${totalHours.toFixed(2)} Stunden`, {
      x: 380,
      y: yPosition,
      size: 12,
    })

    // Footer mit Datum
    yPosition -= lineHeight * 2
    page.drawText(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, {
      x: 50,
      y: yPosition,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save()

    // Dateiname: Jahr_Monat_Kundenname.pdf
    const filename = `${year}_${monthStr}_${customerName}.pdf`

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Fehler beim PDF-Export' }, { status: 500 })
  }
}
