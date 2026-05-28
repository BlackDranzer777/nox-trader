import React from 'react'
import type { Order, Side } from '../../types'
import { formatPrice, formatVolume } from '../../utils/formatters'
import styles from './OrderBook.module.css'

interface Props {
  order: Order
  side: Side
  maxQty: number
}

const OrderBookRow: React.FC<Props> = React.memo(({ order, side, maxQty }) => {
  const qty = parseFloat(order.quantity)
  const total = parseFloat(order.price) * qty
  const barPct = maxQty > 0 ? (qty / maxQty) * 100 : 0

  return (
    <div className={`${styles.row} ${side === 'bid' ? styles.rowBid : styles.rowAsk}`}>
      <span className={styles.price}>{formatPrice(order.price)}</span>
      <span className={styles.qty}>{formatVolume(order.quantity)}</span>
      <span className={styles.total}>{formatVolume(total.toString())}</span>
      <div className={styles.bar} style={{ width: `${barPct}%` }} />
    </div>
  )
})

OrderBookRow.displayName = 'OrderBookRow'

export default OrderBookRow
