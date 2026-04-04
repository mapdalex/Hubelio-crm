'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  FileEdit, 
  Eye, 
  CheckCircle, 
  Clock, 
  Upload, 
  CheckCheck, 
  XCircle, 
  AlertCircle 
} from 'lucide-react'

type SocialPostStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'REJECTED'

interface StatusBadgeProps {
  status: SocialPostStatus
  showIcon?: boolean
  size?: 'sm' | 'default'
}

const statusConfig: Record<SocialPostStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  DRAFT: {
    label: 'Entwurf',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: FileEdit,
  },
  REVIEW: {
    label: 'In Pruefung',
    variant: 'outline',
    className: 'border-amber-500 text-amber-600 dark:text-amber-400',
    icon: Eye,
  },
  APPROVED: {
    label: 'Freigegeben',
    variant: 'outline',
    className: 'border-green-500 text-green-600 dark:text-green-400',
    icon: CheckCircle,
  },
  SCHEDULED: {
    label: 'Geplant',
    variant: 'default',
    className: 'bg-blue-500 text-white hover:bg-blue-600',
    icon: Clock,
  },
  PUBLISHING: {
    label: 'Wird gepostet...',
    variant: 'default',
    className: 'bg-purple-500 text-white animate-pulse',
    icon: Upload,
  },
  PUBLISHED: {
    label: 'Veroeffentlicht',
    variant: 'default',
    className: 'bg-green-500 text-white hover:bg-green-600',
    icon: CheckCheck,
  },
  FAILED: {
    label: 'Fehlgeschlagen',
    variant: 'destructive',
    className: '',
    icon: AlertCircle,
  },
  REJECTED: {
    label: 'Abgelehnt',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
}

export function StatusBadge({ status, showIcon = true, size = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0'
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {config.label}
    </Badge>
  )
}

export function getStatusLabel(status: SocialPostStatus): string {
  return statusConfig[status].label
}
