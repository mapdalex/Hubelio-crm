import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import RequestsClient from './requests-client'

export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <RequestsClient />
    </Suspense>
  )
}
