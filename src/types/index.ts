/*
 * An Order is a single row in the order book.
 * Think of it like one person standing in line saying
 * "I want to buy/sell THIS much at THIS price"
 */
export interface Order {
  price: string      // the price they want to buy/sell at (string because Binance sends it as string)
  quantity: string   // how much they want to buy/sell
}

/*
 * OrderBookState is a snapshot of the entire order book at a given moment.
 * Bids are people who want to BUY (they're bidding on the asset).
 * Asks are people who want to SELL (they're asking for money for their asset).
 * The best bid is the highest someone is willing to pay.
 * The best ask is the lowest someone is willing to accept.
 */
export interface OrderBookState {
  bids: Order[]         // sorted highest price first — the most eager buyers are at the top
  asks: Order[]         // sorted lowest price first — the cheapest sellers are at the top
  lastUpdateId: number  // a sequence number from Binance so we know if we missed any updates
}

/*
 * A RawOrderBookMessage is exactly what Binance sends us over the WebSocket
 * when the order book changes. It contains CHANGES, not the full book.
 * "b" means bids that changed, "a" means asks that changed.
 * Each entry is [price, newQuantity] — if newQuantity is "0", that price level was removed.
 */
export interface RawOrderBookMessage {
  e: string           // event type, always "depthUpdate"
  E: number           // event time as unix timestamp in ms
  s: string           // the trading pair symbol, e.g. "BTCUSDT"
  U: number           // first update ID in this event (for sequencing)
  u: number           // last update ID in this event
  b: [string, string][] // bid changes: array of [price, quantity] pairs
  a: [string, string][] // ask changes: array of [price, quantity] pairs
}

/*
 * A RawOrderBookSnapshot is what we get from the REST API when we first load the page.
 * Instead of changes, it gives us the FULL current order book so we have a starting point.
 */
export interface RawOrderBookSnapshot {
  lastUpdateId: number      // sequence number so we can sync with WebSocket updates
  bids: [string, string][]  // full list of [price, quantity] bid levels
  asks: [string, string][]  // full list of [price, quantity] ask levels
}

/*
 * A Trade is one completed transaction — a buyer and seller found each other and agreed on a price.
 * This appears in the Trade History panel. Each trade has a direction:
 * if isBuyerMaker=true, the buyer placed a resting order and a seller hit it (the SELLER was aggressive)
 * if isBuyerMaker=false, the seller had a resting order and a buyer hit it (the BUYER was aggressive)
 */
export interface Trade {
  id: number         // unique trade ID from Binance
  price: string      // the price this trade happened at
  quantity: string   // how much was traded
  time: number       // unix timestamp in ms when the trade occurred
  isBuyerMaker: boolean  // true = sell-initiated (red), false = buy-initiated (green)
}

/*
 * A RawTradeMessage is the raw WebSocket event for a completed trade.
 * Binance uses single-letter keys to keep the payload small.
 */
export interface RawTradeMessage {
  e: string   // event type, always "trade"
  E: number   // event time
  s: string   // symbol
  t: number   // trade ID
  p: string   // price
  q: string   // quantity
  T: number   // trade time
  m: boolean  // is the buyer the maker? true = red trade, false = green trade
}

/*
 * A Kline is one candle on the candlestick chart.
 * Each candle covers a time period (like 1 minute) and shows how price moved during that time.
 * OHLC = Open, High, Low, Close — the four prices that define the candle shape.
 */
export interface Kline {
  time: number    // the start time of this candle (unix timestamp in SECONDS, not ms — lightweight-charts wants seconds)
  open: number    // the first trade price during this candle's time window
  high: number    // the highest trade price during this window
  low: number     // the lowest trade price during this window
  close: number   // the last trade price during this window
  volume: number  // total volume traded during this window
}

/*
 * A RawKlineMessage is what Binance sends us for each candle update.
 * The actual candle data lives inside the "k" field.
 * isKlineClosed=true means the candle is DONE and we should add it to the chart.
 * isKlineClosed=false means we should UPDATE the current (in-progress) candle.
 */
export interface RawKlineMessage {
  e: string   // event type, always "kline"
  E: number   // event time
  s: string   // symbol
  k: {
    t: number    // candle start time in ms
    T: number    // candle close time in ms
    s: string    // symbol
    i: string    // interval e.g. "1m"
    o: string    // open price
    c: string    // close price
    h: string    // high price
    l: string    // low price
    v: string    // base asset volume
    x: boolean   // is this candle closed? (completed = true)
  }
}

/*
 * TickerStats holds the 24-hour summary for a trading pair.
 * This powers the Market Stats bar at the top of the dashboard.
 * "24h" means rolling 24 hours from right now, not midnight to midnight.
 */
export interface TickerStats {
  symbol: string         // the trading pair, e.g. "BTCUSDT"
  lastPrice: string      // the very latest trade price
  priceChange: string    // how much the price changed in the last 24h (can be negative)
  priceChangePercent: string  // same but as a percentage, e.g. "-2.34"
  highPrice: string      // highest price in the last 24h
  lowPrice: string       // lowest price in the last 24h
  volume: string         // total base asset volume in last 24h (e.g. BTC traded)
  quoteVolume: string    // total quote asset volume (e.g. USDT amount)
}

/*
 * A RawTickerMessage is the raw WebSocket payload for 24h ticker stats.
 * Again, Binance uses short keys to keep bandwidth low.
 */
export interface RawTickerMessage {
  e: string   // event type, always "24hrTicker"
  E: number   // event time
  s: string   // symbol
  p: string   // price change
  P: string   // price change percent
  c: string   // last price
  h: string   // high price
  l: string   // low price
  v: string   // total traded base asset volume
  q: string   // total traded quote asset volume
}

/*
 * DepthPoint is one point on the depth chart.
 * For bids, it shows: at this price, how much total volume is available from here DOWN.
 * For asks, it shows: at this price, how much total volume is available from here UP.
 * "cumulative" is the key — it's a running total, not just one level.
 */
export interface DepthPoint {
  price: number       // the price level
  bidVolume?: number  // cumulative bid volume at or below this price (undefined for ask-only points)
  askVolume?: number  // cumulative ask volume at or above this price (undefined for bid-only points)
}

/*
 * TradingPair describes one of the pairs in our dropdown selector.
 * symbol is what Binance uses internally (uppercase, no slash).
 * label is what we show to the user (human-readable).
 */
export interface TradingPair {
  symbol: string   // e.g. "BTCUSDT" — used in API calls and WebSocket URLs
  label: string    // e.g. "BTC / USDT" — displayed in the pair selector
}

/*
 * TimeFrame is the interval for candlestick data.
 * We support 4 intervals. The value matches what Binance expects in the API URL.
 */
export type TimeFrame = '1m' | '5m' | '15m' | '1h'

/*
 * Side indicates which side of the order book we're talking about.
 * Used when we need to pass around "this is a bid" or "this is an ask"
 * without using a plain string that could be misspelled.
 */
export type Side = 'bid' | 'ask'

/*
 * AppStore is the shape of our global Zustand state.
 * It holds the things that multiple components need to share and agree on.
 */
export interface AppStore {
  selectedPair: TradingPair         // the currently selected trading pair
  selectedTimeFrame: TimeFrame      // the currently selected candle interval
  setSelectedPair: (pair: TradingPair) => void         // action to change the pair
  setSelectedTimeFrame: (tf: TimeFrame) => void        // action to change the timeframe
}
