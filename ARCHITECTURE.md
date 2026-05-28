# NoxTrader — Architecture Guide

> "I solemnly swear I am up to good trades."

This document explains how the app is built, why certain decisions were made, and how to talk about it intelligently.

---

## A) Overall Data Flow — From WebSocket to Your Screen

Here's the journey a single price change takes from Binance to the rendered UI:

```
Binance Server
     │
     │  WebSocket (raw JSON text, ~100ms intervals)
     ▼
useWebSocket.ts
     │  parses JSON, calls your onMessage callback
     ▼
useOrderBook / useTrades / useKlines / useMarketStats
     │  these hooks process the raw data into clean TypeScript objects
     ▼
React State (useState)
     │  only updated at most 60 times per second (order book uses RAF)
     ▼
Components (OrderBook, TradeHistory, PriceChart, DepthChart, MarketStats)
     │  React re-renders only the parts that changed
     ▼
Your Browser Screen
```

The key idea: **the WebSocket and the screen are decoupled**. The WebSocket runs at its own speed (Binance pushes data every 100ms or faster). React renders at its own speed (up to 60fps). The hooks bridge the two.

---

## B) Why useRef + requestAnimationFrame Instead of useState for the Order Book

This is the most important performance decision in the whole app. Here's the problem:

The order book WebSocket stream fires **10 times per second** (every 100ms). If you called `setState` directly inside the WebSocket message handler, React would try to re-render the entire OrderBook component 10 times per second. With 40 rows (20 bids + 20 asks) each with bar animations, that's a lot of DOM work. On slower machines it would cause visible lag and stutter.

**The solution: useRef as a mutable buffer, requestAnimationFrame as a rate limiter.**

Here's how it works:

1. The order book data lives in `bidMapRef` and `askMapRef` — these are plain JS objects (not React state). When a WebSocket message arrives, we mutate the refs directly. No re-render triggered.

2. `requestAnimationFrame` is the browser's built-in "run this before the next screen repaint" function. It fires at most 60 times per second — and often less if the tab is hidden or the screen is idle.

3. We run a RAF loop that checks a `dirtyRef` flag. When a WebSocket update comes in, we set `dirty = true`. The RAF loop sees `dirty` and calls `setState` once, then clears the flag.

**Result:** No matter how fast WebSocket messages arrive (10/s, 50/s, 100/s), React only re-renders when the browser is ready to paint — at most 60fps. The UI stays smooth.

**ASCII version of the flow:**

```
Binance WebSocket
     │
     │ fires every ~100ms
     ▼
handleMessage()
     │
     ├─► if snapshot not loaded: push to pendingBuffer[]
     │
     └─► if snapshot loaded:
              │
              ▼
         applyDelta(bidMapRef, askMapRef)   ← mutates refs, NO re-render
              │
              ▼
         dirtyRef.current = true            ← marks "we have new data"
              │
              ▼
         requestAnimationFrame fires        ← browser decides when (max 60fps)
              │
              ▼
         if (dirtyRef) setState(...)        ← THIS triggers React re-render
              │
              ▼
         OrderBook component renders        ← smooth, at most 60fps
```

---

## C) How Pair Switching Works

When the user picks a new pair from the dropdown (say, switching from BTC/USDT to ETH/USDT):

1. **PairSelector** calls `setSelectedPair(newPair)` in the Zustand store.

2. **Zustand** updates its state. Any component subscribed to `selectedPair` re-renders.

3. **All hooks** (`useOrderBook`, `useTrades`, `useKlines`, `useMarketStats`) receive the new symbol via their props. Each has a `useEffect` that depends on `symbol`.

4. **useWebSocket** — because the `url` prop changes (it includes the symbol), the `connect` function rebuilds with the new URL. The `useEffect` cleanup runs first:
   - It sets `isMountedRef.current = false`
   - Cancels any pending reconnect timer
   - Closes the old WebSocket (`ws.onclose = null` prevents it from triggering a reconnect)
   - Then immediately opens a fresh WebSocket to the new pair's stream.

5. **useOrderBook** — the `useEffect` on `symbol` change:
   - Resets the bid/ask maps to empty objects
   - Resets the snapshot-loaded flag
   - Cancels any in-flight REST request
   - Fetches a fresh snapshot for the new symbol
   - The WebSocket messages for the new symbol start buffering immediately

6. **useTrades** — clears the trades array via `useEffect([symbol])`.

7. **useKlines** — clears klines and fetches new historical candles from REST.

**The old WebSocket connections are guaranteed to be closed** because `useWebSocket` sets `ws.onclose = null` before calling `ws.close()`. This prevents the auto-reconnect logic from kicking in for the old URL.

---

## D) Full Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Binance WebSocket Servers                                       │
│                                                                  │
│  wss://.../btcusdt@depth@100ms    ──► order book changes        │
│  wss://.../btcusdt@trade          ──► completed trades          │
│  wss://.../btcusdt@kline_1m       ──► candle updates            │
│  wss://.../btcusdt@ticker         ──► 24h stats                 │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  useWebSocket.ts  (generic, reconnecting WebSocket hook)         │
│                                                                  │
│  • Opens the connection                                          │
│  • Parses JSON                                                   │
│  • Calls onMessage(data) callback                                │
│  • Auto-reconnects if connection drops                           │
│  • Cleans up on unmount or URL change                            │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────┴──────────────────┐
      │                         │
      ▼                         ▼
┌──────────────┐       ┌─────────────────────────────────────────┐
│ useOrderBook │       │  useTrades / useKlines / useMarketStats  │
│              │       │                                          │
│  • Buffers   │       │  • Simple: just call setState() on each  │
│    WS msgs   │       │    incoming message                      │
│  • useRef    │       │  • useTrades keeps last 50 trades        │
│    (no       │       │  • useKlines also fetches 200 candles    │
│    re-render)│       │    from REST on mount                    │
│  • RAF loop  │       └──────────────────┬──────────────────────┘
│  • setState  │                          │
│    max 60fps │                          │
└──────┬───────┘                          │
       │                                  │
       ▼                                  ▼
┌────────────────────────────────────────────────────────────────┐
│  React Components                                               │
│                                                                 │
│  OrderBook ──► reads bids[], asks[] from useOrderBook          │
│  DepthChart ─► reads bids[], asks[] from useOrderBook          │
│  PriceChart ─► reads klines[] from useKlines                   │
│  TradeHistory► reads trades[] from useTrades                   │
│  MarketStats ► reads stats from useMarketStats                 │
│  PairSelector► reads/writes selectedPair from Zustand          │
└────────────────────────────────────────────────────────────────┘
```

**Also: Binance REST API** → `useOrderBook` (initial snapshot) and `useKlines` (historical candles)

---

## E) TypeScript Crash Course for This Project

You know JavaScript. TypeScript is JavaScript with labels. That's it. Here's every TypeScript concept used in this project:

---

### `interface` — A Shape Definition

```typescript
// "Any object claiming to be an Order MUST have these two fields."
interface Order {
  price: string
  quantity: string
}

// ✅ This is valid:
const myOrder: Order = { price: "50000.00", quantity: "0.5" }

// ❌ This would error at compile time (missing quantity):
const badOrder: Order = { price: "50000.00" }
```

Think of it like a contract. You declare the shape, and TypeScript enforces it everywhere that type is used.

---

### `type` vs `interface` — When to Use Which

For this project: **basically the same**. The difference matters in edge cases we don't hit.

Convention we follow:
- `interface` for object shapes (things with named fields)
- `type` for unions (picking one from a list of options)

```typescript
// interface for object shapes:
interface TickerStats {
  lastPrice: string
  highPrice: string
  // ...
}

// type for unions (pick exactly one):
type Side = 'bid' | 'ask'            // can only be one of these two strings
type TimeFrame = '1m' | '5m' | '15m' | '1h'  // exactly one interval
```

---

### Generics with Hooks — "What's Inside the Box"

```typescript
// useState<string> means: this piece of state holds a string
const [name, setName] = useState<string>('')

// useState<Order[]> means: this holds an ARRAY of Order objects
const [bids, setBids] = useState<Order[]>([])

// useState<boolean> means: this holds true or false
const [loading, setLoading] = useState<boolean>(false)

// useState<TickerStats | null> means: holds a TickerStats OR null
// (null = "we don't have data yet")
const [stats, setStats] = useState<TickerStats | null>(null)
```

The `<Type>` in angle brackets is a **generic** — you're telling TypeScript "this box holds THIS type of thing." TypeScript will then yell at you if you try to put the wrong type in.

In our hooks, we do this a lot:
```typescript
// useWebSocket<T> — T is whatever message type this stream sends
// When T = RawTradeMessage, onMessage receives a RawTradeMessage
function useWebSocket<T>(url: string, onMessage: (data: T) => void): void

// Usage:
useWebSocket<RawTradeMessage>(wsUrl, handleMessage)
// Now TypeScript knows handleMessage gets a RawTradeMessage
```

---

### Function Parameter Types

```typescript
// "give me a number, I'll give you back a string"
function formatPrice(price: number): string {
  return price.toFixed(2)
}

// "give me a string OR a number (I handle both), I'll give you a string"
function formatVolume(qty: string | number): string {
  const n = typeof qty === 'string' ? parseFloat(qty) : qty
  // ...
}

// Arrow function version — same idea:
const formatTime = (ts: number): string => {
  // ...
}
```

---

### Optional Fields — "Might Not Exist"

```typescript
interface DepthPoint {
  price: number
  bidVolume?: number   // ? means: could be a number, could be undefined
  askVolume?: number   // bid-only points won't have askVolume, and vice versa
}

// Safe to do — TypeScript won't complain about missing fields:
const point: DepthPoint = { price: 50000 }  // bidVolume and askVolume are optional
```

---

### The `as` Keyword — "Trust Me, TypeScript"

```typescript
// Sometimes TypeScript doesn't know the exact type, but you do.
// Example: fetch() returns Response, and .json() returns unknown.
// We KNOW Binance gives us an RawOrderBookSnapshot, so we assert it:
const data = await res.json() as RawOrderBookSnapshot

// Another example from PriceChart:
// lightweight-charts wants Time type, but our klines have number timestamps
// We know a unix timestamp number IS a valid Time, so:
time: k.time as Time
```

Use `as` sparingly. It's like telling TypeScript "I know what I'm doing here." If you're wrong, you get a runtime error instead of a compile error.

---

### Common Types Used in This Project

| Type | Means | Example in this project |
|------|-------|------------------------|
| `string` | text | prices from Binance API (`"50234.12"`) |
| `number` | number | computed values, timestamps |
| `boolean` | true/false | `isBuyerMaker`, `isKlineClosed` |
| `string[]` or `Array<string>` | array of strings | list of pair symbols |
| `Record<string, string>` | object where keys are strings, values are strings | our bid/ask price maps: `{ "50000": "1.23", "49999": "0.5" }` |
| `() => void` | function that takes nothing, returns nothing | cleanup functions, event handlers |
| `React.FC` | a React functional component | all our components are `React.FC` |
| `React.ReactNode` | anything React can render (JSX, string, number, null) | children props |

---

## F) How to Talk About This Project in an Interview

Here are 5 solid talking points about the real technical decisions made here:

---

### 1. "We solved the 100ms WebSocket vs 60fps render problem with useRef + requestAnimationFrame"

*"Binance pushes order book updates every 100ms — that's 10 updates per second. Naively calling setState on every message would thrash React. Instead, I buffer the raw data in a useRef (plain mutation, no re-render), and use a requestAnimationFrame loop that reads the buffer and calls setState at most 60 times per second. This decouples the data source's speed from the render speed, keeping the UI smooth even on slower machines."*

---

### 2. "We handle the REST + WebSocket synchronization problem in the order book"

*"The tricky part of a real-time order book is bootstrapping it correctly. If you just start applying WebSocket deltas without a baseline, you get garbage data. The approach: open the WebSocket FIRST (so we don't miss any messages), buffer those messages in memory, then fetch the REST snapshot. Once the snapshot arrives, discard all buffered messages older than the snapshot's sequence number, apply the rest in order, then switch to live updates. This is exactly the approach Binance documents for their depth API."*

---

### 3. "Zustand keeps pair state global without prop drilling"

*"Multiple unrelated components need to know the selected pair: OrderBook fetches from one WebSocket, PriceChart fetches from another, MarketStats from a third. Instead of prop drilling through a common ancestor, we use a tiny Zustand store with `selectedPair` and `setSelectedPair`. Each hook reads the pair directly from the store. When the user changes the pair, all hooks independently disconnect their old streams and reconnect to the new ones — no coordination needed."*

---

### 4. "React.memo on OrderBookRow prevents N×M renders"

*"The order book renders 40 rows (20 bids + 20 asks). When new data comes in via the RAF loop, React would normally re-render all 40 rows. Most rows don't change — maybe 2-3 price levels update per batch. By wrapping OrderBookRow in React.memo, React shallow-compares the props before re-rendering. Rows whose price and quantity didn't change skip the render entirely. This is a big win given the order book updates up to 60fps."*

---

### 5. "CSS Modules give us zero-cost component isolation"

*"Every component has its own `.module.css` file. Vite transforms these at build time — every class name gets a unique hash suffix (e.g. `row_a1b2c3`). There's no runtime cost, no class name collisions between components, and no need for a CSS-in-JS library that adds bundle weight. All design tokens live in `globals.css` as CSS custom properties (variables), so the dark theme is defined once and referenced everywhere."*

---

*Built with React 18, Vite, TypeScript, Zustand, Recharts, lightweight-charts v5, and the Binance public WebSocket API.*
