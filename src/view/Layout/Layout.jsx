import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import Nav from '../../Components/NavBar/nav'
import { ToastContainer } from 'react-toastify'
import { PermissionsProvider } from '../../context/PermissionsContext'
import './layout.css'

const COLLAPSE_KEY = 'ui.sidebarCollapsed'

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

const Layout = ({ children }) => {
  const location = useLocation()
  // Desktop: icon-only sidebar. Mobile: off-canvas drawer.
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        // storage unavailable: keep the in-memory state only
      }
      return !c
    })
  }, [])

  // Close the drawer after navigating and on Escape.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <PermissionsProvider>
      <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-drawer-open' : ''}`}>
        <aside className="app-sidebar" aria-label="Main navigation">
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>
        {mobileOpen && <div className="app-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
        <div className="app-main">
          <Nav onOpenMenu={() => setMobileOpen(true)} />
          <main className="app-content" id="main-content">
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
    </PermissionsProvider>
  )
}

export default Layout
