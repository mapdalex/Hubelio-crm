import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId } = await params
    const data = await request.json()

    // Verify user is admin or owner of this company
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { protocol, host, port, username, password, useSsl } = data

    if (!host || !username || !password) {
      return NextResponse.json(
        { message: 'Host, Benutzername und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    // For now, we'll do a basic connectivity check
    // In production, this would use imapflow to actually test the connection
    try {
      // Attempt a basic TCP connection test
      const net = await import('net')
      
      const testConnection = () => new Promise<boolean>((resolve, reject) => {
        const socket = new net.Socket()
        const timeout = 10000 // 10 seconds
        
        socket.setTimeout(timeout)
        
        socket.on('connect', () => {
          socket.destroy()
          resolve(true)
        })
        
        socket.on('timeout', () => {
          socket.destroy()
          reject(new Error('Connection timeout'))
        })
        
        socket.on('error', (err) => {
          socket.destroy()
          reject(err)
        })
        
        socket.connect(port, host)
      })

      await testConnection()
      
      return NextResponse.json({
        success: true,
        message: `Verbindung zu ${host}:${port} erfolgreich!`,
      })
    } catch (connError) {
      console.error('[v0] Connection test failed:', connError)
      return NextResponse.json(
        { 
          success: false,
          message: `Verbindung fehlgeschlagen: ${connError instanceof Error ? connError.message : 'Unbekannter Fehler'}` 
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[v0] Error testing email connection:', error)
    return NextResponse.json(
      { message: 'Fehler beim Verbindungstest' },
      { status: 500 }
    )
  }
}
