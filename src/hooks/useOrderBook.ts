/*
 * WHAT: Manages the live order book by syncing a REST snapshot with real-time WebSocket delta updates.
 *
 * HOW IT WORKS:
 * 1. Fetch a full order book snapshot from Binance REST API to get the starting state.
 * 2. Subscribe to the WebSocket depth stream — this sends us just the CHANGES (deltas) as they happen.
 * 3. Buffer any WebSocket messages that arrive BEFORE the REST snapshot is ready (they come in fast).
 * 4. Once the snapshot arrives, apply the buffered messages in order, then keep applying live updates.
 * 5. Each WebSocket update is stored in a ref (not state) to avoid triggering React renders 100x/sec.
 * 6. requestAnimationFrame fires at 60fps max and ONLY THEN updates React state (batch rendering).
 *    This keeps the UI smooth — instead of re-rendering 10 times per second, we render at most 60fps.
 *
 * RETURNS: { bids, asks, lastUpdateId }
 *   bids — sorted array of buy orders (highest price first), ready to render
 *   asks — sorted array of sell orders (lowest price first), ready to render
 *   lastUpdateId — the latest sequence number (for debugging sync issues)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { OrderBookState, RawOrderBookMessage, RawOrderBookSnapshot } from '../types'
import { useWebSocket } from './useWebSocket'
import { applyDelta, sortedBids, sortedAsks } from '../utils/orderBookEngine'
import { WS_BASE, REST_BASE } from '../utils/constants'

export function useOrderBook(symbol: string): OrderBookState {
  const [orderBook, setOrderBook] = useState<OrderBookState>({ bids: [], asks: [], lastUpdateId: 0 })

  // These refs hold the raw price→quantity maps and are mutated directly (no re-render on change)
  const bidMapRef = useRef<Record<string, string>>({})
  const askMapRef = useRef<Record<string, string>>({})
  const lastUpdateIdRef = useRef<number>(0)
  const snapshotLoadedRef = useRef(false)

  // Buffer holds messages that arrive before the REST snapshot is ready
  const pendingBufferRef = useRef<RawOrderBookMessage[]>([])

  // rafIdRef lets us cancel the pending animation frame on cleanup
  const rafIdRef = useRef<number | null>(null)

  // dirtyRef is true when new data arrived that hasn't been flushed to React state yet
  const dirtyRef = useRef(false)

  // The RAF loop: only calls setOrderBook when new data actually arrived
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current !== null) return  // already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      if (dirtyRef.current) {
        dirtyRef.current = false
        setOrderBook({
          bids: sortedBids(bidMapRef.current),
          asks: sortedAsks(askMapRef.current),
          lastUpdateId: lastUpdateIdRef.current,
        })
      }
      scheduleFlush()  // schedule next frame check
    })
  }, [])

  // Process a single depth update message
  const applyUpdate = useCallback((msg: RawOrderBookMessage) => {
    // Discard messages that are older than our snapshot
    if (msg.u <= lastUpdateIdRef.current) return

    applyDelta(bidMapRef.current, msg.b)
    applyDelta(askMapRef.current, msg.a)
    lastUpdateIdRef.current = msg.u
    dirtyRef.current = true
  }, [])

  // WebSocket message handler — buffer before snapshot, apply after
  const handleMessage = useCallback((msg: RawOrderBookMessage) => {
    if (!snapshotLoadedRef.current) {
      pendingBufferRef.current.push(msg)
      return
    }
    applyUpdate(msg)
  }, [applyUpdate])

  const wsUrl = `${WS_BASE}/${symbol.toLowerCase()}@depth@100ms`
  useWebSocket<RawOrderBookMessage>(wsUrl, handleMessage)

  // Fetch the initial snapshot and then drain the buffer
  useEffect(() => {
    snapshotLoadedRef.current = false
    pendingBufferRef.current = []
    bidMapRef.current = {}
    askMapRef.current = {}
    lastUpdateIdRef.current = 0
    dirtyRef.current = false

    let cancelled = false

    async function fetchSnapshot() {
      try {
        const res = await fetch(`${REST_BASE}/depth?symbol=${symbol}&limit=20`)
        const data: RawOrderBookSnapshot = await res.json()
        if (cancelled) return

        // Seed the maps from the snapshot
        for (const [price, qty] of data.bids) bidMapRef.current[price] = qty
        for (const [price, qty] of data.asks) askMapRef.current[price] = qty
        lastUpdateIdRef.current = data.lastUpdateId

        snapshotLoadedRef.current = true

        // Drain buffered messages, discarding stale ones
        for (const msg of pendingBufferRef.current) {
          applyUpdate(msg)
        }
        pendingBufferRef.current = []
        dirtyRef.current = true
      } catch {
        // On failure, retry after a short delay
        if (!cancelled) setTimeout(fetchSnapshot, 3000)
      }
    }

    fetchSnapshot()
    scheduleFlush()

    return () => {
      cancelled = true
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [symbol, applyUpdate, scheduleFlush])

  return orderBook
}
