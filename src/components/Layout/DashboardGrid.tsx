import React from 'react'
import styles from './Layout.module.css'
import OrderBook from '../OrderBook/OrderBook'
import PriceChart from '../PriceChart/PriceChart'
import TradeHistory from '../TradeHistory/TradeHistory'
import DepthChart from '../DepthChart/DepthChart'

const DashboardGrid: React.FC = () => {
  return (
    <main className={styles.grid}>
      <div className={styles.areaOrderbook}>
        <OrderBook />
      </div>
      <div className={styles.areaPricechart}>
        <PriceChart />
      </div>
      <div className={styles.areaTrades}>
        <TradeHistory />
      </div>
      <div className={styles.areaDepthchart}>
        <DepthChart />
      </div>
    </main>
  )
}

export default DashboardGrid
