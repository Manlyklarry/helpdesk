import { useState } from 'react'
import { Sidebar } from './Sidebar'

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('helpdesk-sidebar') === 'collapsed'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('helpdesk-sidebar', next ? 'collapsed' : 'expanded')
      } catch {}
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div
        className="flex-1 min-w-0 transition-[margin-left] duration-200 ease-in-out"
        style={{ marginLeft: collapsed ? '60px' : '240px' }}
      >
        {children}
      </div>
    </div>
  )
}
