import { create } from 'zustand'

export type CartItem = {
  id: string // composite id: `${contentId}:${ticketType}`
  contentId: string
  contentTitle: string
  ticketType: 'standard' | 'vip' | 'premium' | string
  unitPriceCents: number
  quantity: number
}

type CartState = {
  items: Record<string, CartItem>
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: {},
  addItem: (item) => set((state) => {
    const id = `${item.contentId}:${item.ticketType}`
    const existing = state.items[id]
    const nextQty = (existing?.quantity || 0) + Math.max(1, item.quantity || 1)
    return {
      items: {
        ...state.items,
        [id]: {
          id,
          ...item,
          quantity: Math.min(10, nextQty),
        },
      },
    }
  }),
  removeItem: (id) => set((state) => {
    const n = { ...state.items }
    delete n[id]
    return { items: n }
  }),
  updateQty: (id, qty) => set((state) => {
    const clamped = Math.max(1, Math.min(10, Number(qty) || 1))
    const it = state.items[id]
    if (!it) return { items: state.items }
    return { items: { ...state.items, [id]: { ...it, quantity: clamped } } }
  }),
  clear: () => set({ items: {} }),
}))

export const selectCartArray = (s: ReturnType<typeof useCartStore.getState>) => Object.values(s.items)
export const selectCartCount = (s: ReturnType<typeof useCartStore.getState>) => Object.values(s.items).reduce((a, b) => a + b.quantity, 0)
export const selectSubtotalCents = (s: ReturnType<typeof useCartStore.getState>) => Object.values(s.items).reduce((a, b) => a + b.unitPriceCents * b.quantity, 0)
