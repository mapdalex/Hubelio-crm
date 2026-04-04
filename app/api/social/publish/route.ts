import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisher } from '@/lib/social/platforms'

// POST /api/social/publish
// Cron job to publish scheduled posts
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all scheduled posts that are due
    const now = new Date()
    const postsToPublish = await db.socialPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        targetAccounts: {
          include: {
            account: true,
          },
        },
      },
    })

    if (postsToPublish.length === 0) {
      return NextResponse.json({ message: 'No posts to publish', count: 0 })
    }

    const results: { postId: string; success: boolean; error?: string }[] = []

    for (const post of postsToPublish) {
      // Update status to PUBLISHING
      await db.socialPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING' },
      })

      let allSucceeded = true
      let lastError: string | undefined

      // Publish to each target account
      for (const targetAccount of post.targetAccounts) {
        const account = targetAccount.account
        
        if (!account.isActive) {
          // Skip inactive accounts
          await db.socialPostAccount.update({
            where: { id: targetAccount.id },
            data: {
              status: 'failed',
              errorMessage: 'Account ist inaktiv',
            },
          })
          allSucceeded = false
          continue
        }

        try {
          const publisher = getPublisher(account.platform)
          
          const result = await publisher.publish({
            content: post.content,
            postType: post.postType,
            media: post.media.map(m => ({
              type: m.type as 'image' | 'video',
              url: m.url,
              thumbnail: m.thumbnail || undefined,
              altText: m.altText || undefined,
            })),
            accessToken: account.accessToken,
            accountId: account.accountId,
          })

          // Update target account status
          await db.socialPostAccount.update({
            where: { id: targetAccount.id },
            data: {
              status: result.success ? 'published' : 'failed',
              publishedAt: result.success ? new Date() : null,
              platformPostId: result.platformPostId,
              platformUrl: result.platformUrl,
              errorMessage: result.error,
            },
          })

          if (!result.success) {
            allSucceeded = false
            lastError = result.error
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          await db.socialPostAccount.update({
            where: { id: targetAccount.id },
            data: {
              status: 'failed',
              errorMessage,
            },
          })
          
          allSucceeded = false
          lastError = errorMessage
        }
      }

      // Update post status based on results
      const finalStatus = allSucceeded ? 'PUBLISHED' : 'FAILED'
      
      await db.socialPost.update({
        where: { id: post.id },
        data: {
          status: finalStatus,
          publishedAt: allSucceeded ? new Date() : null,
          errorMessage: lastError,
        },
      })

      results.push({
        postId: post.id,
        success: allSucceeded,
        error: lastError,
      })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Published ${successCount} posts, ${failCount} failed`,
      count: postsToPublish.length,
      results,
    })
  } catch (error) {
    console.error('Error in publish cron:', error)
    return NextResponse.json({ error: 'Publishing failed' }, { status: 500 })
  }
}

// Also allow GET for testing
export async function GET(request: NextRequest) {
  return POST(request)
}
