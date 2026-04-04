'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  ImagePlus, 
  X, 
  Loader2, 
  Video, 
  Image as ImageIcon,
  GripVertical,
  Upload,
} from 'lucide-react'
import { PlatformIcon, getPlatformName } from './platform-icon'
import { cn } from '@/lib/utils'

type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN'
type SocialPostType = 'POST' | 'REEL' | 'STORY' | 'VIDEO' | 'CAROUSEL'

type SocialAccount = {
  id: string
  platform: SocialPlatform
  accountName: string
  profileImage: string | null
}

type MediaItem = {
  id?: string
  type: 'image' | 'video'
  url: string
  file?: File
  thumbnail?: string
  altText?: string
  duration?: number
  width?: number
  height?: number
}

interface PostEditorProps {
  accounts: SocialAccount[]
  initialData?: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accountIds: string[]
    scheduledFor?: string
  }
  onSave: (data: {
    content: string
    postType: SocialPostType
    media: MediaItem[]
    accountIds: string[]
    scheduledFor?: string
  }) => Promise<void>
  onCancel?: () => void
  isSaving?: boolean
}

const postTypes: { value: SocialPostType; label: string; description: string }[] = [
  { value: 'POST', label: 'Beitrag', description: 'Normaler Bild- oder Textbeitrag' },
  { value: 'REEL', label: 'Reel', description: 'Kurzvideo fuer Instagram/TikTok' },
  { value: 'STORY', label: 'Story', description: '24h sichtbarer Inhalt' },
  { value: 'VIDEO', label: 'Video', description: 'Laengeres Video' },
  { value: 'CAROUSEL', label: 'Karussell', description: 'Mehrere Bilder/Videos' },
]

// Character limits per platform
const characterLimits: Record<SocialPlatform, number> = {
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
  TIKTOK: 2200,
  LINKEDIN: 3000,
}

export function PostEditor({ 
  accounts, 
  initialData, 
  onSave, 
  onCancel,
  isSaving = false,
}: PostEditorProps) {
  const [content, setContent] = useState(initialData?.content || '')
  const [postType, setPostType] = useState<SocialPostType>(initialData?.postType || 'POST')
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media || [])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(initialData?.accountIds || [])
  const [scheduledFor, setScheduledFor] = useState(initialData?.scheduledFor || '')
  const [isUploading, setIsUploading] = useState(false)

  // Get minimum character limit from selected accounts
  const getMinCharacterLimit = () => {
    if (selectedAccounts.length === 0) return 2200
    const selectedPlatforms = accounts
      .filter(a => selectedAccounts.includes(a.id))
      .map(a => a.platform)
    return Math.min(...selectedPlatforms.map(p => characterLimits[p]))
  }

  const minLimit = getMinCharacterLimit()
  const isOverLimit = content.length > minLimit

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (media.length + acceptedFiles.length > 10) {
      toast.error('Maximal 10 Medien erlaubt')
      return
    }

    setIsUploading(true)
    
    try {
      const newMedia: MediaItem[] = []
      
      for (const file of acceptedFiles) {
        const isVideo = file.type.startsWith('video/')
        
        // Upload to Vercel Blob
        const formData = new FormData()
        formData.append('file', file)
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!res.ok) throw new Error('Upload fehlgeschlagen')
        
        const data = await res.json()
        
        newMedia.push({
          type: isVideo ? 'video' : 'image',
          url: data.url,
          file,
          thumbnail: data.thumbnail,
        })
      }
      
      setMedia(prev => [...prev, ...newMedia])
      
      // Auto-select post type based on media
      if (newMedia.some(m => m.type === 'video') && postType === 'POST') {
        setPostType('VIDEO')
      }
      if (media.length + newMedia.length > 1 && postType === 'POST') {
        setPostType('CAROUSEL')
      }
    } catch (error) {
      toast.error('Fehler beim Hochladen')
    } finally {
      setIsUploading(false)
    }
  }, [media, postType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index))
    if (media.length <= 2) {
      setPostType('POST')
    }
  }

  const moveMedia = (fromIndex: number, toIndex: number) => {
    setMedia(prev => {
      const newMedia = [...prev]
      const [removed] = newMedia.splice(fromIndex, 1)
      newMedia.splice(toIndex, 0, removed)
      return newMedia
    })
  }

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Bitte Inhalt eingeben')
      return
    }
    if (selectedAccounts.length === 0) {
      toast.error('Bitte mindestens einen Account auswaehlen')
      return
    }
    if (isOverLimit) {
      toast.error(`Text ist zu lang (max. ${minLimit} Zeichen)`)
      return
    }

    await onSave({
      content: content.trim(),
      postType,
      media,
      accountIds: selectedAccounts,
      scheduledFor: scheduledFor || undefined,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Inhalt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Was moechtest du teilen?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{content.length} Zeichen</span>
                <span className={isOverLimit ? 'text-destructive' : ''}>
                  Max. {minLimit} Zeichen
                  {isOverLimit && ` (${content.length - minLimit} zu viel)`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beitragstyp</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as SocialPostType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {postTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Medien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Uploaded Media */}
            {media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {media.map((item, index) => (
                  <div 
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                  >
                    {item.type === 'video' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Video className="h-8 w-8 text-white" />
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Controls */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {index > 0 && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => moveMedia(index, index - 1)}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Position indicator */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {index + 1}
                    </div>

                    {/* Type indicator */}
                    <div className="absolute bottom-2 right-2">
                      {item.type === 'video' ? (
                        <Video className="h-4 w-4 text-white drop-shadow" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                isUploading && 'opacity-50 pointer-events-none'
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Wird hochgeladen...</p>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isDragActive 
                        ? 'Dateien hier ablegen...' 
                        : 'Bilder oder Videos hierher ziehen oder klicken'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF, MP4, MOV (max. 100MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Account Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Accounts verbunden. Bitte zuerst in den Einstellungen verbinden.
              </p>
            ) : (
              accounts.map(account => (
                <label
                  key={account.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedAccounts.includes(account.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  )}
                >
                  <Checkbox
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <PlatformIcon platform={account.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      @{account.accountName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getPlatformName(account.platform)}
                    </p>
                  </div>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle>Zeitplanung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Datum & Uhrzeit (optional)</Label>
              <input
                type="datetime-local"
                id="scheduledFor"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Wenn leer, wird der Post als Entwurf gespeichert.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || selectedAccounts.length === 0 || !content.trim()}
            className="w-full"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Speichern' : 'Entwurf erstellen'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Abbrechen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
