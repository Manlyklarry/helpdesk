import { Navbar } from '../components/Navbar'

export function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      </main>
    </div>
  )
}
