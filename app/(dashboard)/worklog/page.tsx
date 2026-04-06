import { WorklogClient } from './worklog-client'

export const metadata = {
  title: 'Worklog',
  description: 'Stundenerfassung zur Kundenabrechnung',
}

export default function WorklogPage() {
  return <WorklogClient />
}
