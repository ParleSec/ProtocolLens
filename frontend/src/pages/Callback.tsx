import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { TokenInspector } from '../components/lookingglass/TokenInspector'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token?: string
  scope?: string
}

export function Callback() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [tokens, setTokens] = useState<TokenResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<'access' | 'id' | 'refresh'>('access')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(searchParams.get('error_description') || errorParam)
      setStatus('error')
      return
    }

    if (!code) {
      setError('No authorization code received')
      setStatus('error')
      return
    }

    // Get the flow type from session storage
    const flowType = sessionStorage.getItem('oauth_flow_type') || 'oauth2'
    const codeVerifier = sessionStorage.getItem('pkce_verifier')
    
    // Build token request
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: window.location.origin + '/callback',
      client_id: 'public-app', // Use public client (no secret needed)
    })

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier)
    }

    // Use the correct endpoint based on flow type
    const tokenEndpoint = flowType === 'oidc' ? '/oidc/token' : '/oauth2/token'

    fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error_description || data.error || 'Token exchange failed')
        }
        return data
      })
      .then(data => {
        setTokens(data)
        setStatus('success')
        // Clean up session storage
        sessionStorage.removeItem('pkce_verifier')
        sessionStorage.removeItem('oauth_flow_type')
      })
      .catch(err => {
        setError(err.message)
        setStatus('error')
      })
  }, [searchParams])

  const getTokenValue = (): string => {
    if (!tokens) return ''
    switch (selectedToken) {
      case 'access':
        return tokens.access_token
      case 'id':
        return tokens.id_token || ''
      case 'refresh':
        return tokens.refresh_token || ''
      default:
        return ''
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Exchanging Authorization Code
            </h1>
            <p className="text-surface-400">Please wait while we complete the OAuth flow...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Authentication Successful!
            </h1>
            <p className="text-surface-400">
              Tokens received successfully. Explore the decoded tokens below.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center"
            >
              <XCircle className="w-8 h-8 text-red-400" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Authentication Failed
            </h1>
            <p className="text-red-400">{error}</p>
          </>
        )}
      </motion.div>

      {/* Tokens Display */}
      {status === 'success' && tokens && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Token Summary */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-display font-semibold text-white mb-4">Token Response</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-surface-900">
                <span className="text-xs text-surface-500 block mb-1">Token Type</span>
                <span className="text-white font-medium">{tokens.token_type}</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-900">
                <span className="text-xs text-surface-500 block mb-1">Expires In</span>
                <span className="text-white font-medium">{tokens.expires_in}s</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-900">
                <span className="text-xs text-surface-500 block mb-1">Scope</span>
                <span className="text-white font-medium text-sm">{tokens.scope || 'N/A'}</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-900">
                <span className="text-xs text-surface-500 block mb-1">ID Token</span>
                <span className="text-white font-medium">{tokens.id_token ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Token Selector */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-semibold text-white">Token Inspector</h2>
              <div className="flex-1" />
              <div className="flex gap-1 p-1 rounded-lg bg-surface-900">
                <button
                  onClick={() => setSelectedToken('access')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedToken === 'access'
                      ? 'bg-accent-purple text-white'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  Access Token
                </button>
                {tokens.id_token && (
                  <button
                    onClick={() => setSelectedToken('id')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedToken === 'id'
                        ? 'bg-accent-orange text-white'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    ID Token
                  </button>
                )}
                {tokens.refresh_token && (
                  <button
                    onClick={() => setSelectedToken('refresh')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedToken === 'refresh'
                        ? 'bg-accent-cyan text-white'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Refresh Token
                  </button>
                )}
              </div>
            </div>

            {/* Raw Token */}
            <div className="mb-4">
              <span className="text-xs text-surface-500 block mb-2">Raw Token</span>
              <div className="p-3 rounded-lg bg-surface-900 font-mono text-xs text-surface-300 break-all max-h-24 overflow-y-auto">
                {getTokenValue() || 'No token available'}
              </div>
            </div>

            {/* Decoded Token */}
            {getTokenValue() && <TokenInspector token={getTokenValue()} />}
          </div>

          {/* Next Steps */}
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/looking-glass"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              Open Looking Glass
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange text-white font-medium hover:opacity-90 transition-opacity"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      )}

      {/* Error Actions */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange text-white font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </div>
  )
}
