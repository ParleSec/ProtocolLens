import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, Shield, Key, Lock, Clock, AlertTriangle, 
  CheckCircle, XCircle, ChevronRight,
  Play, RotateCcw, Zap, Copy, Check,
  ArrowRight, Globe, Terminal, Info
} from 'lucide-react'
import { TokenInspector } from '../components/lookingglass/TokenInspector'
import { useWebSocket } from '../hooks/useWebSocket'

// Stage type definition
interface Stage {
  id: string
  name: string
  icon: React.ElementType
  color: string
  description: string
  details: string[]
  security: string
  code?: string
}

// Stage definitions with detailed explanations
const stages: Record<string, Stage> = {
  pkce_generation: {
    id: 'pkce_generation',
    name: 'PKCE Generation',
    icon: Lock,
    color: 'cyan',
    description: 'Generating cryptographic PKCE parameters to secure the authorization code exchange.',
    details: [
      'Creates a high-entropy random string called code_verifier (43-128 chars)',
      'Computes SHA-256 hash of verifier to create code_challenge',
      'Base64URL encodes the challenge for URL-safe transmission',
      'Verifier is stored securely client-side until token exchange'
    ],
    security: 'PKCE prevents authorization code interception attacks by proving the same client that started the flow is completing it.',
    code: `// Generate code_verifier
const verifier = base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));

// Generate code_challenge
const challenge = base64URLEncode(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
);`
  },
  authorization_request: {
    id: 'authorization_request',
    name: 'Authorization Request',
    icon: Globe,
    color: 'blue',
    description: 'Redirecting user to authorization server with OAuth parameters.',
    details: [
      'Browser redirects to authorization endpoint with required parameters',
      'client_id identifies your application to the authorization server',
      'redirect_uri specifies where to send the user after authorization',
      'scope defines what permissions are being requested',
      'state parameter prevents CSRF attacks',
      'code_challenge enables PKCE verification'
    ],
    security: 'Always validate state parameter on callback to prevent CSRF. Use exact redirect_uri matching.',
    code: `GET /oauth2/authorize?
  response_type=code
  &client_id=your-app
  &redirect_uri=https://yourapp.com/callback
  &scope=openid profile email
  &state=random_csrf_token
  &code_challenge=E9Melho...
  &code_challenge_method=S256`
  },
  user_authentication: {
    id: 'user_authentication',
    name: 'User Authentication',
    icon: Shield,
    color: 'purple',
    description: 'User authenticates with the authorization server and grants consent.',
    details: [
      'Authorization server presents login form (not your application!)',
      'User enters credentials directly to the trusted identity provider',
      'Your application never sees the user\'s password',
      'Server validates credentials and checks consent status',
      'User may be prompted to approve requested scopes'
    ],
    security: 'The client application never handles user credentials - this is a core security principle of OAuth 2.0.',
  },
  authorization_response: {
    id: 'authorization_response',
    name: 'Authorization Response',
    icon: ArrowRight,
    color: 'yellow',
    description: 'Authorization server redirects back with an authorization code.',
    details: [
      'Server redirects browser to your redirect_uri',
      'Authorization code is included as a query parameter',
      'State parameter is echoed back for CSRF validation',
      'Code is short-lived (typically 1-10 minutes)',
      'Code can only be used once'
    ],
    security: 'Verify the state parameter matches what you sent. Authorization codes are single-use and expire quickly.',
    code: `HTTP/1.1 302 Found
Location: https://yourapp.com/callback?
  code=authorization_code_here
  &state=random_csrf_token`
  },
  token_exchange: {
    id: 'token_exchange',
    name: 'Token Exchange',
    icon: Key,
    color: 'green',
    description: 'Client exchanges authorization code for access tokens.',
    details: [
      'Backend server makes POST request to token endpoint',
      'Includes authorization code received from callback',
      'code_verifier proves client identity (PKCE)',
      'Confidential clients also include client_secret',
      'Server validates all parameters before issuing tokens'
    ],
    security: 'This request should happen server-to-server to protect client secrets and tokens.',
    code: `POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=authorization_code_here
&redirect_uri=https://yourapp.com/callback
&client_id=your-app
&code_verifier=original_verifier`
  },
  token_validation: {
    id: 'token_validation',
    name: 'Token Validation',
    icon: CheckCircle,
    color: 'emerald',
    description: 'Validating received tokens and extracting claims.',
    details: [
      'Verify JWT signature using authorization server\'s public keys',
      'Check token hasn\'t expired (exp claim)',
      'Validate issuer (iss) matches expected authorization server',
      'Confirm audience (aud) matches your client_id',
      'For OIDC: verify nonce matches what was sent'
    ],
    security: 'Always validate tokens before trusting their contents. Use the JWKS endpoint to get signing keys.',
    code: `// JWT validation steps
1. Decode the JWT header to get 'kid' (key ID)
2. Fetch public key from /.well-known/jwks.json
3. Verify signature using RS256/ES256
4. Check claims: exp, iat, iss, aud, sub`
  },
}

type StageId = 'pkce_generation' | 'authorization_request' | 'user_authentication' | 'authorization_response' | 'token_exchange' | 'token_validation'

interface FlowEvent {
  id: string
  stage: StageId
  timestamp: Date
  status: 'pending' | 'success' | 'error'
  data?: Record<string, unknown>
  duration?: number
}

export function LookingGlass() {
  const [events, setEvents] = useState<FlowEvent[]>([])
  const [selectedStage, setSelectedStage] = useState<StageId | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentSimStep, setCurrentSimStep] = useState(0)
  const [pastedToken, setPastedToken] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const { lastMessage } = useWebSocket('/ws/lookingglass')

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const parsed = JSON.parse(lastMessage) as {
          type?: string
          success?: boolean
          data?: Record<string, unknown>
          duration?: number
        }
        const event: FlowEvent = {
          id: crypto.randomUUID(),
          stage: (parsed.type || 'unknown') as StageId,
          timestamp: new Date(),
          status: parsed.success ? 'success' : 'error',
          data: parsed.data,
          duration: parsed.duration,
        }
        setEvents(prev => [event, ...prev].slice(0, 50))
      } catch {
        // Ignore non-JSON messages
      }
    }
  }, [lastMessage])

  // Simulation flow
  const simulationSteps: StageId[] = [
    'pkce_generation',
    'authorization_request', 
    'user_authentication',
    'authorization_response',
    'token_exchange',
    'token_validation'
  ]

  const runSimulation = () => {
    setIsSimulating(true)
    setCurrentSimStep(0)
    setEvents([])
    
    simulationSteps.forEach((stageId, index) => {
      setTimeout(() => {
        const event: FlowEvent = {
          id: crypto.randomUUID(),
          stage: stageId,
          timestamp: new Date(),
          status: 'success',
          duration: Math.floor(Math.random() * 200) + 50,
        }
        setEvents(prev => [event, ...prev])
        setCurrentSimStep(index + 1)
        setSelectedStage(stageId)
        
        if (index === simulationSteps.length - 1) {
          setTimeout(() => setIsSimulating(false), 500)
        }
      }, (index + 1) * 1200)
    })
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const selectedStageData = selectedStage ? stages[selectedStage] : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Eye className="w-7 h-7 text-accent-cyan" />
            Looking Glass
          </h1>
          <p className="text-surface-400 mt-1">Deep inspection of OAuth 2.0 / OIDC authentication flows</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEvents([])}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Flow Simulation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Flow Progress */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-display font-semibold text-white mb-4">Authentication Flow Progress</h2>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-surface-700">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentSimStep / simulationSteps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Stage nodes */}
          <div className="relative flex justify-between">
            {simulationSteps.map((stageId, index) => {
              const stage = stages[stageId]
              const Icon = stage.icon
              const isCompleted = index < currentSimStep
              const isCurrent = index === currentSimStep - 1 && isSimulating
              const isActive = selectedStage === stageId

              return (
                <button
                  key={stageId}
                  onClick={() => setSelectedStage(stageId)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <motion.div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? `bg-${stage.color}-500/20 border-${stage.color}-500 text-${stage.color}-400`
                        : isCompleted
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : isCurrent
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse'
                        : 'bg-surface-800 border-surface-700 text-surface-500 group-hover:border-surface-500'
                    }`}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium text-center max-w-[80px] ${
                    isActive ? 'text-white' : 'text-surface-400'
                  }`}>
                    {stage.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Detail Panel */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-accent-purple" />
            Stage Details
          </h2>

          <AnimatePresence mode="wait">
            {selectedStageData ? (
              <motion.div
                key={selectedStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Stage header */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-${selectedStageData.color}-500/20 flex items-center justify-center`}>
                    <selectedStageData.icon className={`w-6 h-6 text-${selectedStageData.color}-400`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedStageData.name}</h3>
                    <p className="text-sm text-surface-400">{selectedStageData.description}</p>
                  </div>
                </div>

                {/* What happens */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">What Happens</h4>
                  <ul className="space-y-2">
                    {selectedStageData.details.map((detail, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-surface-300"
                      >
                        <ChevronRight className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                        {detail}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Security note */}
                {selectedStageData.security && (
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200">{selectedStageData.security}</p>
                    </div>
                  </div>
                )}

                {/* Code example */}
                {selectedStageData.code && (
                  <div className="relative rounded-lg bg-surface-900 border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-surface-800 border-b border-white/10">
                      <span className="text-xs text-surface-400 font-medium flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        Example
                      </span>
                      <button
                        onClick={() => copyCode(selectedStageData.code!, selectedStage!)}
                        className="flex items-center gap-1 text-xs text-surface-400 hover:text-white transition-colors"
                      >
                        {copied === selectedStage ? (
                          <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy</>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 overflow-x-auto">
                      <code className="text-xs text-surface-300 font-mono whitespace-pre">
                        {selectedStageData.code}
                      </code>
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-surface-600" />
                </div>
                <p className="text-surface-400">Select a stage above or run the simulation</p>
                <p className="text-surface-500 text-sm mt-1">Click any stage to see detailed information</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Event Log */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-orange" />
            Event Log
          </h2>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-surface-600" />
              </div>
              <p className="text-surface-400">No events yet</p>
              <p className="text-surface-500 text-sm mt-1">Run a simulation or complete a live auth flow</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {events.map((event) => {
                  const stage = stages[event.stage]
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStage === event.stage 
                          ? 'bg-indigo-500/10 border border-indigo-500/30' 
                          : 'bg-surface-900/50 hover:bg-surface-800/50'
                      }`}
                      onClick={() => setSelectedStage(event.stage)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        event.status === 'success' 
                          ? 'bg-green-500/20 text-green-400' 
                          : event.status === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {event.status === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : event.status === 'error' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{stage?.name || event.stage}</p>
                        <p className="text-xs text-surface-500">
                          {event.timestamp.toLocaleTimeString()}
                          {event.duration && ` • ${event.duration}ms`}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Token Inspector */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-accent-green" />
          Token Deep Dive
        </h2>
        <p className="text-surface-400 text-sm mb-4">
          Paste any JWT token to decode it and see the header, payload, and signature validation status.
        </p>
        <textarea
          value={pastedToken}
          onChange={(e) => setPastedToken(e.target.value)}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="w-full h-28 px-4 py-3 rounded-lg bg-surface-900 border border-white/10 text-sm font-mono text-white placeholder-surface-600 focus:outline-none focus:border-accent-cyan/50 resize-none mb-4"
        />
        {pastedToken && <TokenInspector token={pastedToken} />}
      </div>

      {/* Quick Reference */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-display font-semibold text-white mb-4">OAuth 2.0 / OIDC Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surface-900/50">
            <h3 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Token Types
            </h3>
            <ul className="space-y-1.5 text-sm text-surface-300">
              <li><strong className="text-white">Access Token:</strong> Grants API access</li>
              <li><strong className="text-white">ID Token:</strong> User identity (OIDC)</li>
              <li><strong className="text-white">Refresh Token:</strong> Get new tokens</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-surface-900/50">
            <h3 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Key Parameters
            </h3>
            <ul className="space-y-1.5 text-sm text-surface-300">
              <li><strong className="text-white">state:</strong> CSRF protection</li>
              <li><strong className="text-white">nonce:</strong> Replay protection (OIDC)</li>
              <li><strong className="text-white">code_verifier:</strong> PKCE proof</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-surface-900/50">
            <h3 className="font-medium text-orange-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls
            </h3>
            <ul className="space-y-1.5 text-sm text-surface-300">
              <li>Not validating state parameter</li>
              <li>Storing tokens insecurely</li>
              <li>Not implementing token refresh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
