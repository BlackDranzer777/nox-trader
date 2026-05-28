/*
 * WHAT: A generic, auto-reconnecting WebSocket hook that calls a callback each time a message arrives.
 *
 * HOW IT WORKS:
 * 1. When you give it a URL and a callback, it opens a WebSocket connection to that URL.
 * 2. Every time a message arrives, it parses the JSON and calls your callback with the data.
 * 3. If the connection drops (network hiccup, server closed it), it waits 3 seconds and tries again.
 * 4. When the URL changes (e.g. user switches trading pair), it closes the old socket and opens a new one.
 * 5. When the component using this hook unmounts (goes away), it closes the socket cleanly.
 *
 * RETURNS: nothing — it's purely side-effect based. You pass in the callback and it fires it for you.
 */
import { useEffect, useRef, useCallback } from 'react'
import { WS_RECONNECT_DELAY } from '../utils/constants'

export function useWebSocket<T>(
  url: string | null,
  onMessage: (data: T) => void
): void {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  // Stable reference to onMessage so we don't reconnect just because the callback changed
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!url || !isMountedRef.current) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T
        onMessageRef.current(data)
      } catch {
        // silently ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!isMountedRef.current) return
      // schedule reconnect
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect()
      }, WS_RECONNECT_DELAY)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [url])

  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
}
