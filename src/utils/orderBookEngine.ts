import type { Order } from '../types'
import { ORDER_BOOK_DEPTH } from './constants'

/*
 * The order book engine manages a price→quantity map using plain JS objects.
 * We use Record<string, string> (a price-to-quantity dictionary) as our internal
 * data structure because it makes updates O(1) — just set map[price] = qty.
 *
 * When Binance sends a quantity of "0.00000000", it means that price level
 * was completely filled or cancelled and should be REMOVED from the book.
 */

// Apply a batch of [price, quantity] updates to a mutable price map.
// If qty is "0", the level is deleted. Otherwise it's upserted.
export function applyDelta(
  map: Record<string, string>,
  deltas: [string, string][]
): void {
  for (const [price, qty] of deltas) {
    if (parseFloat(qty) === 0) {
      delete map[price]
    } else {
      map[price] = qty
    }
  }
}

// Convert the bid map to a sorted Order[] (highest price first, top N rows).
export function sortedBids(map: Record<string, string>): Order[] {
  return Object.entries(map)
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    .slice(0, ORDER_BOOK_DEPTH)
}

// Convert the ask map to a sorted Order[] (lowest price first, top N rows).
export function sortedAsks(map: Record<string, string>): Order[] {
  return Object.entries(map)
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
    .slice(0, ORDER_BOOK_DEPTH)
}

// Find the max quantity in a list of orders — used to compute the % bar widths.
export function maxQuantity(orders: Order[]): number {
  return orders.reduce((max, o) => Math.max(max, parseFloat(o.quantity)), 0)
}
