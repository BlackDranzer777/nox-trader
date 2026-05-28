import { create } from 'zustand'
import type { AppStore } from '../types'
import { TRADING_PAIRS } from '../utils/constants'

const useStore = create<AppStore>((set) => ({
  selectedPair: TRADING_PAIRS[0],   // default to BTC/USDT
  selectedTimeFrame: '1m',

  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setSelectedTimeFrame: (tf) => set({ selectedTimeFrame: tf }),
}))

export default useStore
