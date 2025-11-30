/**
 * Looking Glass - Protocol Execution & Inspection
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, Play, RotateCcw, Key, Terminal, Square,
  ChevronRight, Fingerprint, Shield, Lock, Sparkles
} from 'lucide-react'

import {
  useProtocols,
  useRealFlowExecutor,
  ProtocolSelector,
  RealFlowPanel,
  type LookingGlassProtocol,
  type LookingGlassFlow,
} from '../lookingglass'

import { TokenInspector } from '../components/lookingglass/TokenInspector'

export function LookingGlass() {
  useParams<{ sessionId?: string }>()

  const [selectedProtocol, setSelectedProtocol] = useState<LookingGlassProtocol | null>(null)
  const [selectedFlow, setSelectedFlow] = useState<LookingGlassFlow | null>(null)
  const [inspectedToken, setInspectedToken] = useState('')

  const { protocols, loading: protocolsLoading } = useProtocols()

  const scopes = useMemo(() => 
    selectedProtocol?.id === 'oidc' 
      ? ['openid', 'profile', 'email'] 
      : ['profile', 'email'],
    [selectedProtocol?.id]
  )

  const clientConfig = useMemo(() => {
    const flowId = selectedFlow?.id?.toLowerCase().replace(/_/g, '-')
    if (flowId === 'client-credentials') {
      return { clientId: 'machine-client', clientSecret: 'machine-secret' }
    }
    return { clientId: 'public-app', clientSecret: undefined }
  }, [selectedFlow?.id])

  const realExecutor = useRealFlowExecutor({
    protocolId: selectedProtocol?.id || null,
    flowId: selectedFlow?.id || null,
    clientId: clientConfig.clientId,
    clientSecret: clientConfig.clientSecret,
    redirectUri: `${window.location.origin}/callback`,
    scopes,
  })

  const handleProtocolSelect = useCallback((protocol: LookingGlassProtocol) => {
    setSelectedProtocol(protocol)
    setSelectedFlow(null)
    realExecutor.reset()
    setInspectedToken('')
  }, [realExecutor])

  const handleFlowSelect = useCallback((flow: LookingGlassFlow) => {
    setSelectedFlow(flow)
    realExecutor.reset()
    setInspectedToken('')
  }, [realExecutor])

  const handleReset = useCallback(() => {
    realExecutor.reset()
    setInspectedToken('')
  }, [realExecutor])

  const handleQuickSelect = useCallback((protocolId: string, flowId: string) => {
    const protocol = protocols.find(p => p.id === protocolId)
    if (protocol) {
      setSelectedProtocol(protocol)
      const flow = protocol.flows.find(f => f.id === flowId)
      if (flow) {
        setSelectedFlow(flow)
        realExecutor.reset()
        setInspectedToken('')
      }
    }
  }, [protocols, realExecutor])

  const hasCapturedTokens = realExecutor.state?.decodedTokens && realExecutor.state.decodedTokens.length > 0
  const status = realExecutor.state?.status || 'idle'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-cyan-400" />
              </div>
              Looking Glass
            </h1>
            <p className="text-surface-400 mt-1 ml-[52px]">
              Execute protocol flows and inspect the traffic
            </p>
          </div>
          
          {status !== 'idle' && (
            <StatusBadge status={status} />
          )}
        </div>
      </header>

      {/* Quick Select - when nothing selected */}
      {!selectedFlow && !protocolsLoading && (
        <section>
          <div className="flex items-center gap-2 text-surface-500 text-sm mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Quick start — select a flow to begin</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FlowButton
              icon={Shield}
              label="Authorization Code"
              sublabel="OAuth 2.0"
              color="blue"
              onClick={() => handleQuickSelect('oauth2', 'authorization_code')}
            />
            <FlowButton
              icon={Lock}
              label="Client Credentials"
              sublabel="OAuth 2.0"
              color="green"
              onClick={() => handleQuickSelect('oauth2', 'client_credentials')}
            />
            <FlowButton
              icon={Fingerprint}
              label="OIDC Auth Code"
              sublabel="OpenID Connect"
              color="orange"
              onClick={() => handleQuickSelect('oidc', 'oidc_authorization_code')}
            />
          </div>
        </section>
      )}

      {/* Protocol Selector */}
      <section className="rounded-xl border border-white/10 bg-surface-900/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-surface-500" />
            <span className="text-sm font-medium text-surface-300">Configuration</span>
          </div>
          {selectedFlow && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
        
        <ProtocolSelector
          protocols={protocols}
          selectedProtocol={selectedProtocol}
          selectedFlow={selectedFlow}
          onProtocolSelect={handleProtocolSelect}
          onFlowSelect={handleFlowSelect}
          loading={protocolsLoading}
        />
      </section>

      {/* Execution */}
      {selectedFlow && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-surface-900/30 overflow-hidden"
        >
          {/* Flow Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Play className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <code className="text-white font-medium">{selectedFlow.id}</code>
                {realExecutor.flowInfo && (
                  <span className="ml-2 text-xs text-surface-500 font-mono">
                    {realExecutor.flowInfo.rfcReference}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {status === 'idle' && (
                <button
                  onClick={realExecutor.execute}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 text-sm font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Execute
                </button>
              )}
              {(status === 'executing' || status === 'awaiting_user') && (
                <button
                  onClick={realExecutor.abort}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Abort
                </button>
              )}
              {status === 'completed' && (
                <button
                  onClick={realExecutor.reset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-white/10 text-surface-400 text-sm hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Run Again
                </button>
              )}
            </div>
          </div>

          {/* Execution Panel */}
          <div className="p-5">
            <RealFlowPanel
              state={realExecutor.state}
              onExecute={realExecutor.execute}
              onAbort={realExecutor.abort}
              onReset={realExecutor.reset}
              isExecuting={realExecutor.isExecuting}
              flowInfo={realExecutor.flowInfo}
              requirements={realExecutor.requirements}
              error={realExecutor.error}
            />
          </div>
        </motion.section>
      )}

      {/* Token Inspector */}
      <AnimatePresence>
        {(hasCapturedTokens || inspectedToken) && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/10 bg-surface-900/30 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Key className="w-4 h-4 text-amber-400" />
                </div>
                <span className="font-medium text-white">Token Inspector</span>
              </div>
              
              {hasCapturedTokens && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-500">Captured:</span>
                  {realExecutor.state?.tokens.accessToken && (
                    <TokenButton
                      label="access_token"
                      color="green"
                      active={inspectedToken === realExecutor.state?.tokens.accessToken}
                      onClick={() => setInspectedToken(realExecutor.state?.tokens.accessToken || '')}
                    />
                  )}
                  {realExecutor.state?.tokens.idToken && (
                    <TokenButton
                      label="id_token"
                      color="orange"
                      active={inspectedToken === realExecutor.state?.tokens.idToken}
                      onClick={() => setInspectedToken(realExecutor.state?.tokens.idToken || '')}
                    />
                  )}
                  {realExecutor.state?.tokens.refreshToken && (
                    <TokenButton
                      label="refresh_token"
                      color="blue"
                      active={inspectedToken === realExecutor.state?.tokens.refreshToken}
                      onClick={() => setInspectedToken(realExecutor.state?.tokens.refreshToken || '')}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="p-5">
              {inspectedToken ? (
                <TokenInspector token={inspectedToken} />
              ) : (
                <div className="text-center py-6 text-surface-500 text-sm">
                  Select a token above to decode
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Manual JWT Input */}
      <section className="rounded-xl border border-white/10 bg-surface-900/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-surface-300">Decode any JWT</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inspectedToken}
            onChange={(e) => setInspectedToken(e.target.value)}
            placeholder="Paste a token here..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface-900 border border-white/10 text-sm font-mono text-white placeholder-surface-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
          {inspectedToken && (
            <button
              onClick={() => setInspectedToken('')}
              className="px-4 py-2.5 rounded-lg bg-surface-800 text-surface-400 hover:text-white text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: 'Completed' },
    executing: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Executing...' },
    awaiting_user: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Awaiting input' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Error' },
  }[status] || { bg: 'bg-surface-800', border: 'border-white/10', text: 'text-surface-400', label: status }

  return (
    <div className={`px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
      <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
    </div>
  )
}

function FlowButton({ 
  icon: Icon, 
  label, 
  sublabel, 
  color,
  onClick 
}: {
  icon: React.ElementType
  label: string
  sublabel: string
  color: 'blue' | 'green' | 'orange' | 'purple'
  onClick: () => void
}) {
  const colors = {
    blue: { border: 'border-blue-500/20 hover:border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    green: { border: 'border-green-500/20 hover:border-green-500/40', bg: 'bg-green-500/10', text: 'text-green-400' },
    orange: { border: 'border-orange-500/20 hover:border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-400' },
    purple: { border: 'border-purple-500/20 hover:border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  }
  const c = colors[color]

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl border ${c.border} bg-gradient-to-br from-white/[0.02] to-transparent hover:from-white/[0.04] transition-all text-left group`}
    >
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white">{label}</div>
        <div className="text-sm text-surface-500">{sublabel}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-surface-600 group-hover:text-surface-400 transition-colors" />
    </button>
  )
}

function TokenButton({ 
  label, 
  color,
  active, 
  onClick 
}: {
  label: string
  color: 'green' | 'orange' | 'blue'
  active: boolean
  onClick: () => void
}) {
  const colors = {
    green: active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-surface-800 text-surface-400 border-transparent hover:text-green-400',
    orange: active ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-surface-800 text-surface-400 border-transparent hover:text-orange-400',
    blue: active ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-surface-800 text-surface-400 border-transparent hover:text-blue-400',
  }

  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${colors[color]}`}
    >
      {label}
    </button>
  )
}
