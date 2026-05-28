import React, { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from 'lightweight-charts'
import useStore from '../../store/useStore'
import { useKlines } from '../../hooks/useKlines'
import { TIME_FRAMES } from '../../utils/constants'
import type { TimeFrame } from '../../types'
import styles from './PriceChart.module.css'

const CHART_COLORS = {
  background: '#12121c',
  text: '#8888aa',
  grid: '#1e1e30',
  border: '#252538',
  upColor: '#00c087',
  downColor: '#f23645',
}

const PriceChart: React.FC = () => {
  const selectedPair = useStore((s) => s.selectedPair)
  const selectedTimeFrame = useStore((s) => s.selectedTimeFrame)
  const setTimeFrame = useStore((s) => s.setSelectedTimeFrame)

  const { klines } = useKlines(selectedPair.symbol, selectedTimeFrame)

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        textColor: CHART_COLORS.text,
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderUpColor: CHART_COLORS.upColor,
      borderDownColor: CHART_COLORS.downColor,
      wickUpColor: CHART_COLORS.upColor,
      wickDownColor: CHART_COLORS.downColor,
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Feed kline data to the chart whenever it changes
  useEffect(() => {
    if (!seriesRef.current || klines.length === 0) return

    const data: CandlestickData<Time>[] = klines.map((k) => ({
      time: k.time as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }))

    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [klines])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{selectedPair.label} — Candlestick</span>
        <div className={styles.timeframes}>
          {TIME_FRAMES.map((tf) => (
            <button
              key={tf}
              className={`${styles.tfBtn} ${tf === selectedTimeFrame ? styles.active : ''}`}
              onClick={() => setTimeFrame(tf as TimeFrame)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <div className={styles.chartInner} ref={containerRef}>
          {klines.length === 0 && (
            <div className={styles.loading}>Loading chart data…</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PriceChart
