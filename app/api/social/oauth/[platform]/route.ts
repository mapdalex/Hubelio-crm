import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin'

// OAuth configuration per platform
const oauthConfig: Record<Platform, {
  authUrl: string
  scopes: string[]
  clientIdEnv: string
  redirectPath: string
}> = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
    clientIdEnv: 'META_APP_ID',
    redirectPath: '/api/social/oauth/instagram/callback',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'publish_video'],
    clientIdEnv: 'META_APP_ID',
    redirectPath: '/api/social/oauth/facebook/callback',
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    redirectPath: '/api/social/oauth/tiktok/callback',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    redirectPath: '/api/social/oauth/linkedin/callback',
  },
}

// Generate random state for CSRF protection
function generateState(companyId: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const random = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${companyId}:${random}`
}

// GET /api/social/oauth/[platform] - Start OAuth flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { platform } = await params
    const platformLower = platform.toLowerCase() as Platform

    if (!oauthConfig[platformLower]) {
      return NextResponse.json({ error: 'Unbekannte Platform' }, { status: 400 })
    }

    // Get companyId from query params
    const companyId = request.nextUrl.searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId fehlt' }, { status: 400 })
    }

    const config = oauthConfig[platformLower]
    const clientId = process.env[config.clientIdEnv]

    if (!clientId) {
      return NextResponse.json({ 
        error: `${platform} ist nicht konfiguriert. Bitte API-Schluessel in den Umgebungsvariablen setzen.`,
        missingEnv: config.clientIdEnv,
      }, { status: 400 })
    }

    // Generate state for CSRF protection
    const state = generateState(companyId)

    // Store state in cookie for validation
    const cookieStore = await cookies()
    cookieStore.set(`oauth_state_${platformLower}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}${config.redirectPath}`

    // Build OAuth URL
    const authUrl = new URL(config.authUrl)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')

    // Platform-specific parameters
    if (platformLower === 'tiktok') {
      authUrl.searchParams.set('scope', config.scopes.join(','))
    } else {
      authUrl.searchParams.set('scope', config.scopes.join(' '))
    }

    // Return the URL for the frontend to redirect to
    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.json({ error: 'OAuth Fehler' }, { status: 500 })
  }
}
