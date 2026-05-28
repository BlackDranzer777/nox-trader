import React from 'react'
import useStore from '../../store/useStore'
import { useOrderBook } from '../../hooks/useOrderBook'
import { maxQuantity } from '../../utils/orderBookEngine'
import { formatPrice, computeSpread } from '../../utils/formatters'
import OrderBookRow from './OrderBookRow'
import styles from './OrderBook.module.css'

const OrderBook: React.FC = () => {
  const symbol = useStore((s) => s.selectedPair.symbol)
  const { bids, asks } = useOrderBook(symbol)

  const maxBidQty = maxQuantity(bids)
  const maxAskQty = maxQuantity(asks)
  const maxQty = Math.max(maxBidQty, maxAskQty)

  const bestBid = bids[0]?.price ?? '0'
  const bestAsk = asks[0]?.price ?? '0'
  const midPrice = bids[0] && asks[0]
    ? ((parseFloat(bestBid) + parseFloat(bestAsk)) / 2).toFixed(2)
    : '—'
  const spread = computeSpread(bestBid, bestAsk)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Order Book</span>
        <span className={styles.spreadBadge}>Spread {spread}</span>
      </div>

      <div className={styles.colHeaders}>
        <span>Price</span>
        <span>Qty</span>
        <span>Total</span>
      </div>

      {/* Asks: displayed in reverse order so lowest ask is closest to spread */}
      <div className={styles.asksSection}>
        <div className={styles.asksList}>
          {asks.slice().reverse().map((order) => (
            <OrderBookRow key={order.price} order={order} side="ask" maxQty={maxQty} />
          ))}
        </div>
      </div>

      <div className={styles.spreadRow}>
        <span className={styles.spreadPrice}>{formatPrice(midPrice)}</span>
        <span className={styles.spreadLabel}>mid</span>
      </div>

      {/* Bids */}
      <div className={styles.bidsSection}>
        <div className={styles.bidsList}>
          {bids.map((order) => (
            <OrderBookRow key={order.price} order={order} side="bid" maxQty={maxQty} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default OrderBook
