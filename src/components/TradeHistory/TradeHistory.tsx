import React from 'react'
import useStore from '../../store/useStore'
import { useTrades } from '../../hooks/useTrades'
import { formatPrice, formatVolume, formatTime } from '../../utils/formatters'
import styles from './TradeHistory.module.css'

const TradeHistory: React.FC = () => {
  const symbol = useStore((s) => s.selectedPair.symbol)
  const { trades } = useTrades(symbol)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Trades</span>
      </div>
      <div className={styles.colHeaders}>
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>
      <div className={styles.list}>
        {trades.map((trade) => {
          const isBuy = !trade.isBuyerMaker
          return (
            <div
              key={trade.id}
              className={`${styles.row} ${isBuy ? styles.buy : styles.sell}`}
            >
              <span className={styles.price}>{formatPrice(trade.price)}</span>
              <span className={styles.qty}>{formatVolume(trade.quantity)}</span>
              <span className={styles.time}>{formatTime(trade.time)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TradeHistory
