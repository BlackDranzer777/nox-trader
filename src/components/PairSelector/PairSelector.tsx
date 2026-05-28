import React from 'react'
import useStore from '../../store/useStore'
import { TRADING_PAIRS } from '../../utils/constants'
import styles from './PairSelector.module.css'

const PairSelector: React.FC = () => {
  const selectedPair = useStore((s) => s.selectedPair)
  const setSelectedPair = useStore((s) => s.setSelectedPair)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pair = TRADING_PAIRS.find((p) => p.symbol === e.target.value)
    if (pair) setSelectedPair(pair)
  }

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={selectedPair.symbol}
        onChange={handleChange}
        aria-label="Select trading pair"
      >
        {TRADING_PAIRS.map((pair) => (
          <option key={pair.symbol} value={pair.symbol}>
            {pair.label}
          </option>
        ))}
      </select>
      <span className={styles.arrow}>▼</span>
    </div>
  )
}

export default PairSelector
