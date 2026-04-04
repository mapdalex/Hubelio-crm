import { Suspense } from 'react'
import { SocialSettingsContent } from '@/components/social/social-settings-content'
import { Loader2 } from 'lucide-react'

export default function SocialSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <SocialSettingsContent />
    </Suspense>
  )
}
