import { useEffect, useState } from 'react'

type HealthStatus = { status: string; timestamp: string }

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError('Could not reach the server.'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Helpdesk</h1>
        <p className="text-gray-500">AI-Powered Ticket Management</p>

        {health && (
          <p className="text-green-600 text-sm">
            Server is <span className="font-medium">{health.status}</span> &mdash; {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}

export default App
