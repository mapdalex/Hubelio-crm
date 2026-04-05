import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/**
 * GET /api/worklogs/export/pdf
 * Exportiert Worklogs als PDF pro Kunde und Monat
 * Query params:
 * - customerId: Customer ID
 * - month: YYYY-MM
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const month = searchParams.get('month'); // YYYY-MM

    if (!customerId || !month) {
      return NextResponse.json(
        { error: 'customerId and month are required' },
        { status: 400 }
      );
    }

    // Get worklogs for the month
    const [year, monthStr] = month.split('-');
    const startDate = new Date(`${year}-${monthStr}-01`);
    const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999);

    const worklogs = await prisma.worklog.findMany({
      where: {
        customerId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
        activity: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    let yPosition = height - 50;

    const fontSize = 12;
    const lineHeight = 20;

    // Header
    page.drawText('Stundenabrechnung', {
      x: 50,
      y: yPosition,
      size: 16,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Customer Info
    page.drawText(`Kunde: ${customer.companyName || `${customer.firstName} ${customer.lastName}`}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= lineHeight;

    page.drawText(`Zeitraum: ${month}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= lineHeight * 2;

    // Table Headers
    page.drawText('Datum', { x: 50, y: yPosition, size: fontSize });
    page.drawText('Mitarbeiter', { x: 150, y: yPosition, size: fontSize });
    page.drawText('Projekt', { x: 280, y: yPosition, size: fontSize });
    page.drawText('Tätigkeit', { x: 380, y: yPosition, size: fontSize });
    page.drawText('Dauer (h)', { x: 480, y: yPosition, size: fontSize });
    yPosition -= lineHeight * 1.5;

    // Draw horizontal line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 550, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;

    // Table Rows
    let totalHours = 0;
    worklogs.forEach((log) => {
      const date = new Date(log.startTime).toLocaleDateString('de-DE');
      const hours = log.duration / 60;
      totalHours += hours;

      page.drawText(date, { x: 50, y: yPosition, size: 10 });
      page.drawText(log.user.name, { x: 150, y: yPosition, size: 10 });
      page.drawText(log.project.name.substring(0, 20), { x: 280, y: yPosition, size: 10 });
      page.drawText(log.activity.name.substring(0, 20), { x: 380, y: yPosition, size: 10 });
      page.drawText(hours.toFixed(2), { x: 480, y: yPosition, size: 10 });
      yPosition -= lineHeight;

      // Add new page if needed
      if (yPosition < 50) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = 792;
        page.copyPages = newPage;
      }
    });

    // Total
    yPosition -= lineHeight;
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 550, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    page.drawText(`Gesamt: ${totalHours.toFixed(2)} Stunden`, {
      x: 380,
      y: yPosition,
      size: 12,
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="worklog_${customer.id}_${month}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
