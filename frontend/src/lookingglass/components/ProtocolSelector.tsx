/**
 * ProtocolSelector Component
 * 
 * Clean, terminal-style dropdowns for protocol and flow selection.
 * Uses React Portal to ensure dropdowns appear above all other content.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, Check } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { LookingGlassProtocol, LookingGlassFlow } from '../types'

interface ProtocolSelectorProps {
  protocols: LookingGlassProtocol[]
  selectedProtocol: LookingGlassProtocol | null
  selectedFlow: LookingGlassFlow | null
  onProtocolSelect: (protocol: LookingGlassProtocol) => void
  onFlowSelect: (flow: LookingGlassFlow) => void
  loading?: boolean
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

export function ProtocolSelector({
  protocols,
  selectedProtocol,
  selectedFlow,
  onProtocolSelect,
  onFlowSelect,
  loading = false,
}: ProtocolSelectorProps) {
  const [isProtocolOpen, setIsProtocolOpen] = useState(false)
  const [isFlowOpen, setIsFlowOpen] = useState(false)
  const [protocolDropdownPos, setProtocolDropdownPos] = useState<DropdownPosition | null>(null)
  const [flowDropdownPos, setFlowDropdownPos] = useState<DropdownPosition | null>(null)
  
  const protocolButtonRef = useRef<HTMLButtonElement>(null)
  const flowButtonRef = useRef<HTMLButtonElement>(null)

  const updateProtocolPosition = useCallback(() => {
    if (protocolButtonRef.current) {
      const rect = protocolButtonRef.current.getBoundingClientRect()
      setProtocolDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      })
    }
  }, [])

  const updateFlowPosition = useCallback(() => {
    if (flowButtonRef.current) {
      const rect = flowButtonRef.current.getBoundingClientRect()
      setFlowDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      })
    }
  }, [])

  useEffect(() => {
    if (isProtocolOpen) {
      updateProtocolPosition()
      window.addEventListener('scroll', updateProtocolPosition, true)
      window.addEventListener('resize', updateProtocolPosition)
      return () => {
        window.removeEventListener('scroll', updateProtocolPosition, true)
        window.removeEventListener('resize', updateProtocolPosition)
      }
    }
  }, [isProtocolOpen, updateProtocolPosition])

  useEffect(() => {
    if (isFlowOpen) {
      updateFlowPosition()
      window.addEventListener('scroll', updateFlowPosition, true)
      window.addEventListener('resize', updateFlowPosition)
      return () => {
        window.removeEventListener('scroll', updateFlowPosition, true)
        window.removeEventListener('resize', updateFlowPosition)
      }
    }
  }, [isFlowOpen, updateFlowPosition])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        protocolButtonRef.current && 
        !protocolButtonRef.current.contains(target) &&
        !(target as Element).closest?.('[data-protocol-dropdown]')
      ) {
        setIsProtocolOpen(false)
      }
      if (
        flowButtonRef.current && 
        !flowButtonRef.current.contains(target) &&
        !(target as Element).closest?.('[data-flow-dropdown]')
      ) {
        setIsFlowOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProtocolOpen(false)
        setIsFlowOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleProtocolSelect = (protocol: LookingGlassProtocol) => {
    onProtocolSelect(protocol)
    setIsProtocolOpen(false)
  }

  const handleFlowSelect = (flow: LookingGlassFlow) => {
    onFlowSelect(flow)
    setIsFlowOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-surface-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-mono">loading protocols...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Protocol Select */}
      <div className="flex items-center gap-2">
        <span className="text-surface-600 text-sm font-mono">protocol:</span>
        <button
          ref={protocolButtonRef}
          onClick={() => {
            setIsFlowOpen(false)
            setIsProtocolOpen(!isProtocolOpen)
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-900 border border-white/10 hover:border-white/20 text-sm font-mono transition-colors min-w-[140px]"
        >
          <span className={selectedProtocol ? 'text-white' : 'text-surface-500'}>
            {selectedProtocol?.id || 'select'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-surface-500 ml-auto transition-transform ${isProtocolOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Flow Select */}
      <div className="flex items-center gap-2">
        <span className="text-surface-600 text-sm font-mono">flow:</span>
        <button
          ref={flowButtonRef}
          onClick={() => {
            if (!selectedProtocol) return
            setIsProtocolOpen(false)
            setIsFlowOpen(!isFlowOpen)
          }}
          disabled={!selectedProtocol}
          className={`flex items-center gap-2 px-3 py-1.5 rounded bg-surface-900 border border-white/10 text-sm font-mono transition-colors min-w-[200px] ${
            selectedProtocol 
              ? 'hover:border-white/20' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <span className={selectedFlow ? 'text-white' : 'text-surface-500'}>
            {selectedFlow?.id || 'select'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-surface-500 ml-auto transition-transform ${isFlowOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Protocol Dropdown Portal */}
      {createPortal(
        <AnimatePresence>
          {isProtocolOpen && protocolDropdownPos && (
            <motion.div
              data-protocol-dropdown
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                top: protocolDropdownPos.top,
                left: protocolDropdownPos.left,
                width: protocolDropdownPos.width,
                zIndex: 99999,
              }}
              className="rounded border border-white/10 bg-surface-900 shadow-xl overflow-hidden"
            >
              {protocols.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => handleProtocolSelect(protocol)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-mono transition-colors ${
                    selectedProtocol?.id === protocol.id
                      ? 'bg-accent-cyan/10 text-accent-cyan'
                      : 'text-surface-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{protocol.id}</span>
                  {selectedProtocol?.id === protocol.id && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Flow Dropdown Portal */}
      {createPortal(
        <AnimatePresence>
          {isFlowOpen && flowDropdownPos && selectedProtocol && (
            <motion.div
              data-flow-dropdown
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                top: flowDropdownPos.top,
                left: flowDropdownPos.left,
                width: flowDropdownPos.width,
                zIndex: 99999,
              }}
              className="rounded border border-white/10 bg-surface-900 shadow-xl overflow-hidden max-h-64 overflow-y-auto"
            >
              {selectedProtocol.flows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => handleFlowSelect(flow)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    selectedFlow?.id === flow.id
                      ? 'bg-accent-cyan/10 text-accent-cyan'
                      : 'text-surface-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-sm font-mono">{flow.id}</div>
                    <div className="text-xs text-surface-500">{flow.name}</div>
                  </div>
                  {selectedFlow?.id === flow.id && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
