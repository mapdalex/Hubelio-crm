import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import TicketsClient from './tickets-client'

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <TicketsClient />
    </Suspense>
  )
}
