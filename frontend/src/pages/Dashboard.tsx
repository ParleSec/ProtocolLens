import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Shield, Lock, Key, Eye, ArrowRight, Zap, 
  ChevronRight, Users, Fingerprint
} from 'lucide-react'

// Protocol cards
const protocolCards = [
  {
    id: 'oauth2',
    name: 'OAuth 2.0',
    description: 'The industry-standard protocol for authorization. Delegate access to resources without sharing credentials.',
    icon: Shield,
    color: 'from-purple-500 to-indigo-600',
    shadowColor: 'shadow-purple-500/25',
    flowCount: 4,
    features: ['Access Tokens', 'Refresh Tokens', 'Scopes', 'PKCE'],
  },
  {
    id: 'oidc',
    name: 'OpenID Connect',
    description: 'Identity layer on top of OAuth 2.0. Verify user identity and obtain profile information.',
    icon: Fingerprint,
    color: 'from-green-500 to-emerald-600',
    shadowColor: 'shadow-green-500/25',
    flowCount: 3,
    features: ['ID Tokens', 'UserInfo', 'Claims', 'SSO'],
  },
]

export function Dashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Interactive Security Protocol Showcase
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange to-accent-purple">OAuth 2.0</span> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-accent-cyan">OIDC</span>
          </h1>
          
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            Explore authentication protocols through interactive diagrams, 
            live demonstrations, and detailed security analysis.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              to="/protocol/oauth2"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-orange to-accent-purple text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-accent-orange/25"
            >
              <Shield className="w-5 h-5" />
              Explore Protocols
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/looking-glass"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <Eye className="w-5 h-5" />
              Looking Glass
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Protocol Cards */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Protocols</h2>
            <p className="text-surface-400 mt-1">Choose a protocol to explore its flows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {protocolCards.map((protocol, idx) => (
            <motion.div
              key={protocol.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link
                to={`/protocol/${protocol.id}`}
                className={`block relative overflow-hidden rounded-2xl p-6 bg-surface-900/50 border border-white/5 hover:border-white/10 transition-all group hover:shadow-xl ${protocol.shadowColor}`}
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${protocol.color}`} />

                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${protocol.color} flex items-center justify-center shadow-lg ${protocol.shadowColor}`}>
                    <protocol.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-xl font-semibold text-white">
                        {protocol.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-surface-400">
                        {protocol.flowCount} flows
                      </span>
                    </div>
                    <p className="text-surface-400 text-sm line-clamp-2">
                      {protocol.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {protocol.features.map(feature => (
                    <span 
                      key={feature}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-surface-400"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Action */}
                <div className="flex items-center gap-1 mt-4 text-sm text-surface-500 group-hover:text-accent-orange transition-colors">
                  <span>Explore flows</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="font-display text-2xl font-bold text-white mb-6">What You'll Learn</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Eye}
            title="Interactive Diagrams"
            description="Sequence diagrams that show each step of the authentication flow. Click any step to see detailed information."
            color="cyan"
          />
          <FeatureCard
            icon={Lock}
            title="Security Deep Dive"
            description="Understand security considerations at each step. Learn about PKCE, state parameters, and token validation."
            color="purple"
          />
          <FeatureCard
            icon={Key}
            title="Token Inspector"
            description="Decode and analyze JWTs. See claims, validate signatures, and understand token structure."
            color="orange"
          />
        </div>
      </section>

      {/* Quick Start */}
      <section className="glass rounded-2xl p-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            number={1}
            title="Choose a Protocol"
            description="Select OAuth 2.0 or OpenID Connect to see available authentication flows."
          />
          <StepCard
            number={2}
            title="Explore a Flow"
            description="View the sequence diagram and step-by-step breakdown of the selected flow."
          />
          <StepCard
            number={3}
            title="Try Live Demo"
            description="Click 'Try Live Demo' to walk through a real authentication flow."
          />
        </div>
      </section>

      {/* Demo Credentials */}
      <section className="glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-accent-green" />
          <h2 className="font-display text-xl font-bold text-white">Demo Credentials</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CredentialCard
            name="Alice"
            email="alice@example.com"
            password="password123"
            role="Standard User"
          />
          <CredentialCard
            name="Bob"
            email="bob@example.com"
            password="password123"
            role="Standard User"
          />
          <CredentialCard
            name="Admin"
            email="admin@example.com"
            password="admin123"
            role="Administrator"
            highlight
          />
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, color }: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600 shadow-cyan-500/25',
    purple: 'from-purple-500 to-indigo-600 shadow-purple-500/25',
    orange: 'from-orange-500 to-red-600 shadow-orange-500/25',
  }

  return (
    <div className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-surface-400 text-sm">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-orange to-accent-purple flex items-center justify-center flex-shrink-0">
        <span className="font-bold text-white">{number}</span>
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-surface-400 text-sm">{description}</p>
      </div>
    </div>
  )
}

function CredentialCard({ name, email, password, role, highlight }: {
  name: string
  email: string
  password: string
  role: string
  highlight?: boolean
}) {
  return (
    <div className={`p-4 rounded-xl ${highlight ? 'bg-accent-orange/10 border border-accent-orange/20' : 'bg-surface-900/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-white">{name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${highlight ? 'bg-accent-orange/20 text-accent-orange' : 'bg-white/10 text-surface-400'}`}>
          {role}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-surface-500">Email:</span>
          <span className="text-surface-300 font-mono">{email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-surface-500">Password:</span>
          <span className="text-surface-300 font-mono">{password}</span>
        </div>
      </div>
    </div>
  )
}
