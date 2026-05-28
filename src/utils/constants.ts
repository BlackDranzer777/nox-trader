import type { TradingPair, TimeFrame } from '../types'

export const WS_BASE = 'wss://stream.binance.com:9443/ws'
export const REST_BASE = 'https://api.binance.com/api/v3'

export const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTCUSDT', label: 'BTC / USDT' },
  { symbol: 'ETHUSDT', label: 'ETH / USDT' },
  { symbol: 'SOLUSDT', label: 'SOL / USDT' },
  { symbol: 'BNBUSDT', label: 'BNB / USDT' },
  { symbol: 'XRPUSDT', label: 'XRP / USDT' },
]

export const TIME_FRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h']

export const ORDER_BOOK_DEPTH = 20   // rows to show per side
export const MAX_TRADES = 50         // max trades to keep in the history list
export const WS_RECONNECT_DELAY = 3000  // ms to wait before reconnecting
