import React from 'react'
import styles from './Layout.module.css'
import PairSelector from '../PairSelector/PairSelector'
import MarketStats from '../MarketStats/MarketStats'

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>✦</span>
        <span className={styles.logoText}>Nox<span>Trader</span></span>
      </div>
      <span className={styles.tagline}>I solemnly swear I am up to good trades.</span>
      <div className={styles.headerDivider} />
      <PairSelector />
      <div className={styles.headerDivider} />
      <div className={styles.headerRight}>
        <MarketStats />
      </div>
    </header>
  )
}

export default Header
