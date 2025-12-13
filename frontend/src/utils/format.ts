/**
 * Formatting utilities for Protocol Showcase
 * 
 * Provides formatters for dates, tokens, durations, and other display values.
 */

/**
 * Format a date to a locale-aware string
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date/time to a locale-aware string
 */
export function formatDateTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format a time only
 */
export function formatTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format a Unix timestamp (seconds) to a date string
 */
export function formatTimestamp(timestamp: number): string {
  return formatDateTime(timestamp * 1000)
}

/**
 * Format a relative time string (e.g., "2 minutes ago", "in 5 hours")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHours = Math.round(diffMin / 60)
  const diffDays = Math.round(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'seconds')
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minutes')
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hours')
  } else {
    return rtf.format(diffDays, 'days')
  }
}

/**
 * Format a duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Format expiration time relative to now
 */
export function formatExpiration(exp: number): {
  status: 'expired' | 'expiring' | 'valid'
  text: string
} {
  const now = Date.now() / 1000
  const diff = exp - now

  if (diff < 0) {
    return {
      status: 'expired',
      text: `Expired ${formatRelativeTime(exp * 1000)}`,
    }
  } else if (diff < 300) {
    return {
      status: 'expiring',
      text: `Expires in ${Math.floor(diff)} seconds`,
    }
  } else if (diff < 3600) {
    return {
      status: 'valid',
      text: `Expires in ${Math.floor(diff / 60)} minutes`,
    }
  } else {
    return {
      status: 'valid',
      text: `Expires in ${Math.floor(diff / 3600)} hours`,
    }
  }
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format a JWT for display (truncated middle)
 */
export function formatJWT(token: string, maxLength: number = 50): string {
  if (!token || !token.includes('.')) return token
  
  const parts = token.split('.')
  if (parts.length !== 3) return truncate(token, maxLength)
  
  const [header, payload, signature] = parts
  
  // Show abbreviated version
  return `${header.slice(0, 10)}...${payload.slice(0, 20)}...${signature.slice(-10)}`
}

/**
 * Format URL for display
 */
export function formatURL(url: string): {
  protocol: string
  host: string
  path: string
  query: string
} {
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.host,
      path: parsed.pathname,
      query: parsed.search,
    }
  } catch {
    return {
      protocol: '',
      host: '',
      path: url,
      query: '',
    }
  }
}

/**
 * Format HTTP headers for display
 */
export function formatHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

/**
 * Format JSON for syntax-highlighted display
 */
export function formatJSON(obj: unknown, indent: number = 2): string {
  try {
    return JSON.stringify(obj, null, indent)
  } catch {
    return String(obj)
  }
}

/**
 * Format scope string as an array
 */
export function parseScopes(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean)
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map(capitalize)
    .join(' ')
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}


