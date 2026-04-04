'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PostEditor } from '@/components/social/post-editor'

type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN'

type SocialAccount = {
  id: string
  platform: SocialPlatform
  accountName: string
  profileImage: string | null
  isActive: boolean
}

export default function NewPostPage() {
  const router = useRouter()
  const { companyId } = useAuth()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [companyId])

  const loadAccounts = async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/accounts`)
      if (res.ok) {
        const data = await res.json()
        // Filter only active accounts
        setAccounts((data.accounts || []).filter((a: SocialAccount) => a.isActive))
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      toast.error('Fehler beim Laden der Accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (data: {
    content: string
    postType: string
    media: { type: string; url: string; thumbnail?: string; altText?: string }[]
    accountIds: string[]
    scheduledFor?: string
  }) => {
    if (!companyId) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/social/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (res.ok) {
        toast.success('Post erstellt')
        router.push('/socials/posts')
      } else {
        toast.error(result.error || 'Fehler beim Erstellen')
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Posts')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/socials/posts">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neuer Post</h1>
          <p className="text-muted-foreground">Erstelle einen neuen Social Media Beitrag</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Keine Social Media Accounts verbunden. Bitte zuerst einen Account verbinden.
          </p>
          <Link href="/settings/social">
            <Button>Accounts verbinden</Button>
          </Link>
        </div>
      ) : (
        <PostEditor
          accounts={accounts}
          onSave={handleSave}
          onCancel={() => router.push('/socials/posts')}
          isSaving={isSaving}
        />
      )}
    </main>
  )
}
