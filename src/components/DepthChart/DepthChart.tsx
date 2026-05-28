import React, { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import useStore from '../../store/useStore'
import { useOrderBook } from '../../hooks/useOrderBook'
import type { DepthPoint } from '../../types'
import { formatPrice, formatVolume } from '../../utils/formatters'
import styles from './DepthChart.module.css'

function buildDepthData(
  bids: { price: string; quantity: string }[],
  asks: { price: string; quantity: string }[]
): DepthPoint[] {
  // Build cumulative bid curve (sorted high→low already, we accumulate left→right)
  const bidPoints: DepthPoint[] = []
  let cumBid = 0
  const sortedBids = [...bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
  for (const b of sortedBids) {
    cumBid += parseFloat(b.quantity)
    bidPoints.push({ price: parseFloat(b.price), bidVolume: cumBid })
  }

  // Build cumulative ask curve (sorted low→high, accumulate left→right)
  const askPoints: DepthPoint[] = []
  let cumAsk = 0
  const sortedAsks = [...asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
  for (const a of sortedAsks) {
    cumAsk += parseFloat(a.quantity)
    askPoints.push({ price: parseFloat(a.price), askVolume: cumAsk })
  }

  // Merge and sort by price
  const merged: DepthPoint[] = [...bidPoints, ...askPoints]
  merged.sort((a, b) => a.price - b.price)
  return merged
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length || label === undefined) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      fontSize: '0.72rem',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
        {formatPrice(label)}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name === 'bidVolume' ? 'Bid' : 'Ask'}: {formatVolume(p.value.toString())}
        </div>
      ))}
    </div>
  )
}

const DepthChart: React.FC = () => {
  const symbol = useStore((s) => s.selectedPair.symbol)
  const { bids, asks } = useOrderBook(symbol)

  const data = useMemo(() => buildDepthData(bids, asks), [bids, asks])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Depth Chart</span>
      </div>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c087" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00c087" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f23645" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f23645" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="price"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => formatPrice(v)}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              scale="linear"
            />
            <YAxis
              tickFormatter={(v) => formatVolume(v.toString())}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="bidVolume"
              stroke="#00c087"
              strokeWidth={1.5}
              fill="url(#bidGrad)"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="stepBefore"
              dataKey="askVolume"
              stroke="#f23645"
              strokeWidth={1.5}
              fill="url(#askGrad)"
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DepthChart
