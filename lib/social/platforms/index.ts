import { SocialPlatform, SocialPostType } from '@prisma/client'

export type PublishResult = {
  success: boolean
  platformPostId?: string
  platformUrl?: string
  error?: string
}

export type MediaItem = {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  altText?: string
}

export interface SocialPublisher {
  platform: SocialPlatform
  publish(params: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accessToken: string
    accountId: string
  }): Promise<PublishResult>
  
  refreshToken?(refreshToken: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresIn?: number
  }>
}

// Instagram Publisher (via Meta Graph API)
export class InstagramPublisher implements SocialPublisher {
  platform = 'INSTAGRAM' as SocialPlatform
  
  async publish(params: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accessToken: string
    accountId: string
  }): Promise<PublishResult> {
    const { content, postType, media, accessToken, accountId } = params
    
    try {
      // Instagram requires media container creation first
      if (media.length === 0 && postType !== 'STORY') {
        return { success: false, error: 'Instagram erfordert mindestens ein Bild oder Video' }
      }

      let containerId: string

      if (postType === 'CAROUSEL' && media.length > 1) {
        // Create carousel container
        const childIds: string[] = []
        
        for (const item of media) {
          const childRes = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                [item.type === 'video' ? 'video_url' : 'image_url']: item.url,
                is_carousel_item: true,
                access_token: accessToken,
              }),
            }
          )
          const childData = await childRes.json()
          if (childData.error) throw new Error(childData.error.message)
          childIds.push(childData.id)
        }

        const carouselRes = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: childIds.join(','),
              caption: content,
              access_token: accessToken,
            }),
          }
        )
        const carouselData = await carouselRes.json()
        if (carouselData.error) throw new Error(carouselData.error.message)
        containerId = carouselData.id

      } else if (postType === 'REEL' || (media[0]?.type === 'video' && postType === 'VIDEO')) {
        // Create reel/video container
        const reelRes = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'REELS',
              video_url: media[0].url,
              caption: content,
              access_token: accessToken,
            }),
          }
        )
        const reelData = await reelRes.json()
        if (reelData.error) throw new Error(reelData.error.message)
        containerId = reelData.id

      } else if (postType === 'STORY') {
        // Create story container
        const storyRes = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: media[0]?.type === 'video' ? 'STORIES' : 'STORIES',
              [media[0]?.type === 'video' ? 'video_url' : 'image_url']: media[0]?.url,
              access_token: accessToken,
            }),
          }
        )
        const storyData = await storyRes.json()
        if (storyData.error) throw new Error(storyData.error.message)
        containerId = storyData.id

      } else {
        // Create single image/video container
        const mediaRes = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              [media[0].type === 'video' ? 'video_url' : 'image_url']: media[0].url,
              caption: content,
              access_token: accessToken,
            }),
          }
        )
        const mediaData = await mediaRes.json()
        if (mediaData.error) throw new Error(mediaData.error.message)
        containerId = mediaData.id
      }

      // Wait for container to be ready (for videos)
      if (media.some(m => m.type === 'video')) {
        await this.waitForContainer(containerId, accessToken)
      }

      // Publish the container
      const publishRes = await fetch(
        `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      )
      const publishData = await publishRes.json()
      if (publishData.error) throw new Error(publishData.error.message)

      return {
        success: true,
        platformPostId: publishData.id,
        platformUrl: `https://instagram.com/p/${publishData.id}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async waitForContainer(containerId: string, accessToken: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )
      const data = await res.json()
      
      if (data.status_code === 'FINISHED') return
      if (data.status_code === 'ERROR') throw new Error('Media processing failed')
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    throw new Error('Media processing timeout')
  }
}

// Facebook Publisher
export class FacebookPublisher implements SocialPublisher {
  platform = 'FACEBOOK' as SocialPlatform

  async publish(params: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accessToken: string
    accountId: string
  }): Promise<PublishResult> {
    const { content, media, accessToken, accountId } = params

    try {
      if (media.length === 0) {
        // Text-only post
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              access_token: accessToken,
            }),
          }
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)

        return {
          success: true,
          platformPostId: data.id,
          platformUrl: `https://facebook.com/${data.id}`,
        }
      }

      // Photo post
      if (media[0].type === 'image') {
        if (media.length === 1) {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: media[0].url,
                caption: content,
                access_token: accessToken,
              }),
            }
          )
          const data = await res.json()
          if (data.error) throw new Error(data.error.message)

          return {
            success: true,
            platformPostId: data.id,
            platformUrl: `https://facebook.com/${data.id}`,
          }
        }

        // Multiple photos
        const photoIds: string[] = []
        for (const item of media) {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: item.url,
                published: false,
                access_token: accessToken,
              }),
            }
          )
          const data = await res.json()
          if (data.error) throw new Error(data.error.message)
          photoIds.push(data.id)
        }

        // Create post with multiple photos
        const attachedMedia = photoIds.map(id => ({ media_fbid: id }))
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${accountId}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              attached_media: attachedMedia,
              access_token: accessToken,
            }),
          }
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)

        return {
          success: true,
          platformPostId: data.id,
          platformUrl: `https://facebook.com/${data.id}`,
        }
      }

      // Video post
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${accountId}/videos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: media[0].url,
            description: content,
            access_token: accessToken,
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      return {
        success: true,
        platformPostId: data.id,
        platformUrl: `https://facebook.com/${data.id}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// TikTok Publisher
export class TikTokPublisher implements SocialPublisher {
  platform = 'TIKTOK' as SocialPlatform

  async publish(params: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accessToken: string
    accountId: string
  }): Promise<PublishResult> {
    const { content, media, accessToken } = params

    try {
      if (media.length === 0 || media[0].type !== 'video') {
        return { success: false, error: 'TikTok erfordert ein Video' }
      }

      // Initialize video upload
      const initRes = await fetch(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            post_info: {
              title: content.slice(0, 150),
              privacy_level: 'SELF_ONLY', // Will need to be PUBLIC_TO_EVERYONE in production
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: media[0].url,
            },
          }),
        }
      )

      const initData = await initRes.json()
      if (initData.error) throw new Error(initData.error.message)

      return {
        success: true,
        platformPostId: initData.data.publish_id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresIn?: number
  }> {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  }
}

// LinkedIn Publisher
export class LinkedInPublisher implements SocialPublisher {
  platform = 'LINKEDIN' as SocialPlatform

  async publish(params: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accessToken: string
    accountId: string
  }): Promise<PublishResult> {
    const { content, media, accessToken, accountId } = params

    try {
      const author = `urn:li:person:${accountId}`

      if (media.length === 0) {
        // Text-only post
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: content },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        })

        const data = await res.json()
        if (data.status >= 400) throw new Error(data.message || 'LinkedIn API error')

        return {
          success: true,
          platformPostId: data.id,
          platformUrl: `https://linkedin.com/feed/update/${data.id}`,
        }
      }

      // Post with image
      if (media[0].type === 'image') {
        // Register image upload
        const registerRes = await fetch(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: author,
                serviceRelationships: [
                  {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                  },
                ],
              },
            }),
          }
        )

        const registerData = await registerRes.json()
        if (registerData.status >= 400) throw new Error(registerData.message)

        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
        const asset = registerData.value.asset

        // Download image and upload to LinkedIn
        const imageRes = await fetch(media[0].url)
        const imageBuffer = await imageRes.arrayBuffer()

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: imageBuffer,
        })

        // Create post with image
        const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: content },
                shareMediaCategory: 'IMAGE',
                media: [
                  {
                    status: 'READY',
                    media: asset,
                    ...(media[0].altText && { 
                      description: { text: media[0].altText }
                    }),
                  },
                ],
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        })

        const postData = await postRes.json()
        if (postData.status >= 400) throw new Error(postData.message)

        return {
          success: true,
          platformPostId: postData.id,
          platformUrl: `https://linkedin.com/feed/update/${postData.id}`,
        }
      }

      return { success: false, error: 'Nicht unterstuetzter Medientyp' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Publisher factory
export function getPublisher(platform: SocialPlatform): SocialPublisher {
  switch (platform) {
    case 'INSTAGRAM':
      return new InstagramPublisher()
    case 'FACEBOOK':
      return new FacebookPublisher()
    case 'TIKTOK':
      return new TikTokPublisher()
    case 'LINKEDIN':
      return new LinkedInPublisher()
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}
