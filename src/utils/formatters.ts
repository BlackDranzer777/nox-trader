// Format a raw price string to a human-readable price with dynamic decimal places
export function formatPrice(price: string | number): string {
  const n = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(n)) return '—'
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

// Format volume with K/M suffix for large numbers
export function formatVolume(qty: string | number): string {
  const n = typeof qty === 'string' ? parseFloat(qty) : qty
  if (isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K'
  return n.toFixed(4)
}

// Format a percent change. Adds a + sign for positive values.
export function formatPercent(pct: string | number): string {
  const n = typeof pct === 'string' ? parseFloat(pct) : pct
  if (isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

// Format a unix timestamp (ms) to HH:MM:SS
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// Compute the bid-ask spread as an absolute value
export function computeSpread(bestBid: string, bestAsk: string): string {
  const bid = parseFloat(bestBid)
  const ask = parseFloat(bestAsk)
  if (isNaN(bid) || isNaN(ask)) return '—'
  return formatPrice(ask - bid)
}
