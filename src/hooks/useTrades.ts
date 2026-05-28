/*
 * WHAT: Subscribes to real-time trade events and maintains a rolling buffer of the last 50 trades.
 *
 * HOW IT WORKS:
 * 1. Opens a WebSocket connection to the Binance trade stream for the given symbol.
 * 2. Each time a trade event arrives, we parse it and create a clean Trade object.
 * 3. We prepend the new trade to the front of the list (newest trades at top).
 * 4. If the list exceeds 50 trades, we drop the oldest ones from the end.
 * 5. When the symbol changes, the list is cleared and we start fresh.
 *
 * RETURNS: { trades }
 *   trades — array of up to 50 Trade objects, newest first, ready to render in the history panel
 */
import { useState, useEffect, useCallback } from 'react'
import type { Trade, RawTradeMessage } from '../types'
import { useWebSocket } from './useWebSocket'
import { WS_BASE, MAX_TRADES } from '../utils/constants'

export function useTrades(symbol: string): { trades: Trade[] } {
  const [trades, setTrades] = useState<Trade[]>([])

  const handleMessage = useCallback((msg: RawTradeMessage) => {
    const trade: Trade = {
      id: msg.t,
      price: msg.p,
      quantity: msg.q,
      time: msg.T,
      isBuyerMaker: msg.m,
    }
    setTrades((prev) => [trade, ...prev].slice(0, MAX_TRADES))
  }, [])

  const wsUrl = `${WS_BASE}/${symbol.toLowerCase()}@trade`
  useWebSocket<RawTradeMessage>(wsUrl, handleMessage)

  // Clear trades when the symbol changes
  useEffect(() => {
    setTrades([])
  }, [symbol])

  return { trades }
}
