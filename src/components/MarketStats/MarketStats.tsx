import React from 'react'
import useStore from '../../store/useStore'
import { useMarketStats } from '../../hooks/useMarketStats'
import { formatPrice, formatVolume, formatPercent } from '../../utils/formatters'
import styles from './MarketStats.module.css'

const Skeleton: React.FC = () => <span className={styles.skeleton} />

const MarketStats: React.FC = () => {
  const symbol = useStore((s) => s.selectedPair.symbol)
  const { stats } = useMarketStats(symbol)

  const pctChange = stats ? parseFloat(stats.priceChangePercent) : 0
  const changeClass = pctChange >= 0 ? styles.up : styles.down

  return (
    <div className={styles.statsBar}>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Last Price</span>
        <span className={`${styles.statValue} ${changeClass}`}>
          {stats ? formatPrice(stats.lastPrice) : <Skeleton />}
        </span>
      </div>

      <div className={styles.separator} />

      <div className={styles.stat}>
        <span className={styles.statLabel}>24h Change</span>
        <span className={`${styles.statValue} ${changeClass}`}>
          {stats ? formatPercent(stats.priceChangePercent) : <Skeleton />}
        </span>
      </div>

      <div className={styles.separator} />

      <div className={styles.stat}>
        <span className={styles.statLabel}>24h High</span>
        <span className={styles.statValue}>
          {stats ? formatPrice(stats.highPrice) : <Skeleton />}
        </span>
      </div>

      <div className={styles.separator} />

      <div className={styles.stat}>
        <span className={styles.statLabel}>24h Low</span>
        <span className={styles.statValue}>
          {stats ? formatPrice(stats.lowPrice) : <Skeleton />}
        </span>
      </div>

      <div className={styles.separator} />

      <div className={styles.stat}>
        <span className={styles.statLabel}>24h Volume</span>
        <span className={styles.statValue}>
          {stats ? formatVolume(stats.volume) : <Skeleton />}
        </span>
      </div>

      <div className={styles.separator} />

      <div className={styles.stat}>
        <span className={styles.statLabel}>Quote Vol</span>
        <span className={styles.statValue}>
          {stats ? formatVolume(stats.quoteVolume) : <Skeleton />}
        </span>
      </div>
    </div>
  )
}

export default MarketStats
