import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin'

// Token exchange endpoints
const tokenEndpoints: Record<Platform, string> = {
  instagram: 'https://api.instagram.com/oauth/access_token',
  facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
  tiktok: 'https://open.tiktokapis.com/v2/oauth/token/',
  linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
}

// Profile endpoints
const profileEndpoints: Record<Platform, string> = {
  instagram: 'https://graph.instagram.com/me',
  facebook: 'https://graph.facebook.com/me',
  tiktok: 'https://open.tiktokapis.com/v2/user/info/',
  linkedin: 'https://api.linkedin.com/v2/me',
}

async function exchangeCodeForToken(platform: Platform, code: string, redirectUri: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  userId?: string
}> {
  const clientId = platform === 'instagram' || platform === 'facebook'
    ? process.env.META_APP_ID
    : platform === 'tiktok'
      ? process.env.TIKTOK_CLIENT_KEY
      : process.env.LINKEDIN_CLIENT_ID

  const clientSecret = platform === 'instagram' || platform === 'facebook'
    ? process.env.META_APP_SECRET
    : platform === 'tiktok'
      ? process.env.TIKTOK_CLIENT_SECRET
      : process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured')
  }

  const tokenUrl = tokenEndpoints[platform]

  if (platform === 'tiktok') {
    // TikTok uses JSON body
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Token exchange failed')

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      userId: data.open_id,
    }
  }

  // Facebook/Instagram/LinkedIn use form-urlencoded
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const response = await fetch(`${tokenUrl}?${params}`, {
    method: platform === 'instagram' ? 'POST' : 'GET',
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || data.error_description || 'Token exchange failed')

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    userId: data.user_id,
  }
}

async function getProfile(platform: Platform, accessToken: string): Promise<{
  id: string
  username: string
  profileUrl?: string
  profileImage?: string
}> {
  const profileUrl = profileEndpoints[platform]

  if (platform === 'instagram') {
    const response = await fetch(`${profileUrl}?fields=id,username,account_type,media_count&access_token=${accessToken}`)
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    
    return {
      id: data.id,
      username: data.username,
      profileUrl: `https://instagram.com/${data.username}`,
    }
  }

  if (platform === 'facebook') {
    // Get user's pages (for posting)
    const response = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`)
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    // Return first page or user profile
    if (data.data && data.data.length > 0) {
      const page = data.data[0]
      return {
        id: page.id,
        username: page.name,
        profileUrl: `https://facebook.com/${page.id}`,
      }
    }

    // Fallback to user profile
    const userResponse = await fetch(`${profileUrl}?fields=id,name&access_token=${accessToken}`)
    const userData = await userResponse.json()
    return {
      id: userData.id,
      username: userData.name,
      profileUrl: `https://facebook.com/${userData.id}`,
    }
  }

  if (platform === 'tiktok') {
    const response = await fetch(`${profileUrl}?fields=open_id,display_name,avatar_url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    return {
      id: data.data.user.open_id,
      username: data.data.user.display_name,
      profileImage: data.data.user.avatar_url,
    }
  }

  if (platform === 'linkedin') {
    const response = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await response.json()
    if (data.status) throw new Error(data.message)

    return {
      id: data.id,
      username: `${data.localizedFirstName} ${data.localizedLastName}`,
      profileUrl: `https://linkedin.com/in/${data.id}`,
    }
  }

  throw new Error('Unknown platform')
}

// GET /api/social/oauth/[platform]/callback - OAuth callback handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url))
    }

    const { platform } = await params
    const platformLower = platform.toLowerCase() as Platform

    // Get authorization code and state from query params
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/settings/social?error=${error}`, request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings/social?error=missing_params', request.url))
    }

    // Validate state
    const cookieStore = await cookies()
    const storedState = cookieStore.get(`oauth_state_${platformLower}`)?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/settings/social?error=invalid_state', request.url))
    }

    // Clear state cookie
    cookieStore.delete(`oauth_state_${platformLower}`)

    // Extract companyId from state
    const companyId = state.split(':')[0]
    if (!companyId) {
      return NextResponse.redirect(new URL('/settings/social?error=missing_company', request.url))
    }

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/social/oauth/${platformLower}/callback`

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(platformLower, code, redirectUri)

    // Get profile info
    const profile = await getProfile(platformLower, tokenData.accessToken)

    // Calculate token expiry
    const tokenExpires = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null

    // Save or update account in database
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        companyId,
        platform: platformLower.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN',
        accountId: profile.id,
      },
    })

    if (existingAccount) {
      await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpires,
          accountName: profile.username,
          profileUrl: profile.profileUrl,
          profileImage: profile.profileImage,
          isActive: true,
        },
      })
    } else {
      await prisma.socialAccount.create({
        data: {
          companyId,
          platform: platformLower.toUpperCase() as 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN',
          accountId: profile.id,
          accountName: profile.username,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpires,
          profileUrl: profile.profileUrl,
          profileImage: profile.profileImage,
        },
      })
    }

    // Redirect to settings with success message
    return NextResponse.redirect(new URL('/settings/social?success=connected', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    const message = error instanceof Error ? error.message : 'unknown_error'
    return NextResponse.redirect(new URL(`/settings/social?error=${encodeURIComponent(message)}`, request.url))
  }
}
