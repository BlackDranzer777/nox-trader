/*
 * WHAT: Subscribes to the Binance 24-hour ticker stream and provides live market stats.
 *
 * HOW IT WORKS:
 * 1. Open a WebSocket connection to the 24hr ticker stream for the current symbol.
 * 2. When a ticker message arrives, map the single-letter Binance keys to readable field names.
 * 3. Store the result in React state — Binance pushes this every second so it's always fresh.
 * 4. When the symbol changes, reset to null and wait for the first message on the new stream.
 *
 * RETURNS: { stats }
 *   stats — a TickerStats object with lastPrice, priceChangePercent, highPrice, lowPrice, volume,
 *           or null if we haven't received data yet (e.g. loading state)
 */
import { useState, useEffect, useCallback } from 'react'
import type { TickerStats, RawTickerMessage } from '../types'
import { useWebSocket } from './useWebSocket'
import { WS_BASE } from '../utils/constants'

export function useMarketStats(symbol: string): { stats: TickerStats | null } {
  const [stats, setStats] = useState<TickerStats | null>(null)

  const handleMessage = useCallback((msg: RawTickerMessage) => {
    setStats({
      symbol: msg.s,
      lastPrice: msg.c,
      priceChange: msg.p,
      priceChangePercent: msg.P,
      highPrice: msg.h,
      lowPrice: msg.l,
      volume: msg.v,
      quoteVolume: msg.q,
    })
  }, [])

  const wsUrl = `${WS_BASE}/${symbol.toLowerCase()}@ticker`
  useWebSocket<RawTickerMessage>(wsUrl, handleMessage)

  // Reset on symbol change
  useEffect(() => {
    setStats(null)
  }, [symbol])

  return { stats }
}
