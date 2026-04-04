import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import ITTicketsClient from './it-tickets-client'

export const dynamic = 'force-dynamic'

export default function ITTicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <ITTicketsClient />
    </Suspense>
  )
}
