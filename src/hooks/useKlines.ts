/*
 * WHAT: Fetches historical candlestick data via REST and then keeps it live with WebSocket updates.
 *
 * HOW IT WORKS:
 * 1. Fetch the last 200 candles from the Binance REST API for the current symbol + timeframe.
 * 2. Subscribe to the WebSocket kline stream for live updates.
 * 3. When a kline message arrives, check if it's for the current (open) candle or a new closed one:
 *    - If it matches the last candle's time → UPDATE that candle in place (price is still moving).
 *    - If it's a new time → APPEND it as a new candle (the old one closed, a new one opened).
 * 4. When symbol or timeframe changes, clear the candle array and re-fetch from REST.
 *
 * RETURNS: { klines }
 *   klines — array of Kline objects (each has time, open, high, low, close, volume)
 *            in chronological order, ready to hand to the lightweight-charts library
 */
import { useState, useEffect, useCallback } from 'react'
import type { Kline, RawKlineMessage } from '../types'
import { useWebSocket } from './useWebSocket'
import { WS_BASE, REST_BASE } from '../utils/constants'

export function useKlines(symbol: string, interval: string): { klines: Kline[] } {
  const [klines, setKlines] = useState<Kline[]>([])

  const handleMessage = useCallback((msg: RawKlineMessage) => {
    const k = msg.k
    const candle: Kline = {
      time: Math.floor(k.t / 1000),  // lightweight-charts wants seconds, Binance sends ms
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    }

    setKlines((prev) => {
      if (prev.length === 0) return [candle]
      const last = prev[prev.length - 1]
      if (last.time === candle.time) {
        // Update the current in-progress candle
        return [...prev.slice(0, -1), candle]
      }
      // New candle opened
      return [...prev, candle]
    })
  }, [])

  const wsUrl = `${WS_BASE}/${symbol.toLowerCase()}@kline_${interval}`
  useWebSocket<RawKlineMessage>(wsUrl, handleMessage)

  // Fetch historical candles whenever symbol or interval changes
  useEffect(() => {
    setKlines([])
    let cancelled = false

    async function fetchHistory() {
      try {
        const url = `${REST_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=200`
        const res = await fetch(url)
        const raw: [number, string, string, string, string, string][] = await res.json()
        if (cancelled) return

        const parsed: Kline[] = raw.map(([t, o, h, l, c, v]) => ({
          time: Math.floor(t / 1000),
          open: parseFloat(o),
          high: parseFloat(h),
          low: parseFloat(l),
          close: parseFloat(c),
          volume: parseFloat(v),
        }))
        setKlines(parsed)
      } catch {
        if (!cancelled) setTimeout(fetchHistory, 3000)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [symbol, interval])

  return { klines }
}
