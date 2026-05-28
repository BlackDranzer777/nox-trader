import React from 'react'
import Header from './components/Layout/Header'
import DashboardGrid from './components/Layout/DashboardGrid'
import styles from './components/Layout/Layout.module.css'

const App: React.FC = () => {
  return (
    <div className={styles.shell}>
      <Header />
      <DashboardGrid />
    </div>
  )
}

export default App
