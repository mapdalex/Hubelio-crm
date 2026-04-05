import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import WorkTimeClient from './worktime-client'

export default function WorkTimePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <WorkTimeClient />
    </Suspense>
  )
}
