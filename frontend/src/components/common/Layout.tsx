import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Eye, Home, Github, ExternalLink } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/looking-glass', icon: Eye, label: 'Looking Glass' },
  ]

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(249, 115, 22, 0.03) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
                           radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.02) 0%, transparent 70%)`
        }} />
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ rotate: 15 }}
                className="p-2 rounded-xl bg-gradient-to-br from-accent-orange to-accent-purple"
              >
                <Shield className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="font-display font-bold text-lg text-white">Protocol Showcase</h1>
                <p className="text-xs text-surface-400">Security Engineering Portfolio</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-surface-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-all ml-2"
              >
                <Github className="w-4 h-4" />
                <span className="text-sm font-medium">Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative pt-24 pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-surface-500">
            <p>Built to demonstrate security engineering expertise</p>
            <p>OAuth 2.0 • OpenID Connect • PKCE • JWT</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

