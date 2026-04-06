import { TodosClient } from './todos-client'

export const metadata = {
  title: 'Todos',
  description: 'Verwalten Sie Ihre Aufgaben und Todos',
}

export default function TodosPage() {
  return <TodosClient />
}
