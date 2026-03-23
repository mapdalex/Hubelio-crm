import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }
    
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
