import { useMemo, useState, useEffect } from 'react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/store/useUserStore'
import { useLocation } from 'wouter'
import { apiRequest } from '@/lib/queryClient'

export default function Cart() {
  // Stato derivato stabilizzato per evitare loop
  const rawItems = useCartStore((s) => s.items)
  const items = useMemo(() => Object.values(rawItems), [rawItems])

  const removeItem = useCartStore((s) => s.removeItem)
  const updateQty = useCartStore((s) => s.updateQty)
  const clear = useCartStore((s) => s.clear)

  const { user } = useUserStore()
  const [, setLocation] = useLocation()

  const [buyerEmail, setBuyerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Calcoli memoizzati per evitare render inutili
  const count = useMemo(() => items.reduce((a, b) => a + b.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((a, b) => a + b.unitPriceCents * b.quantity, 0), [items])
  const formattedSubtotal = useMemo(() => centsToEur(subtotal), [subtotal])

  // Calcolo preventivo (quote) al cambio carrello
  useEffect(() => {
    let aborted = false
    async function doQuote() {
      if (items.length === 0) {
        setQuote(null)
        return
      }
      setQuoteLoading(true)
      try {
        const cart = items.map((it) => ({
          contentId: it.contentId,
          ticketType: it.ticketType,
          quantity: it.quantity
        }))
        const res = await apiRequest('POST', '/api/purchase/cart/quote', { cart })
        const data = await res.json()
        if (!aborted) setQuote(data.breakdown || null)
      } catch (e) {
        if (!aborted) setQuote(null)
      } finally {
        if (!aborted) setQuoteLoading(false)
      }
    }
    doQuote()
    return () => {
      aborted = true
    }
  }, [items])

  // Validazione email
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const canCheckout = useMemo(() => {
    if (items.length === 0) return false
    if (user) return true
    return !!buyerEmail && isValidEmail(buyerEmail)
  }, [items.length, user, buyerEmail])

  const checkout = async () => {
    try {
      setLoading(true)
      const cart = items.map((it) => ({
        contentId: it.contentId,
        ticketType: it.ticketType,
        quantity: it.quantity
      }))

      // Se non loggato → validazione email
      if (!user) {
        if (!(buyerEmail && isValidEmail(buyerEmail))) {
          setEmailError('Inserisci una email valida')
          setLoading(false)
          return
        }
      }

      // Invio richiesta checkout
      const res = await apiRequest('POST', '/api/purchase/cart', {
        cart,
        method: 'manual',
        buyerEmail: user?.email || buyerEmail || undefined
      })

      const data = await res.json()

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.groupId) {
        clear()
        setLocation(`/receipt/${data.groupId}`)
      } else if (data.message) {
        alert(data.message)
      }
    } catch (e) {
      alert((e && e.message) || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-20 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-6">Carrello</h1>

        {items.length === 0 ? (
          <div className="text-muted-foreground">Il carrello è vuoto.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Lista articoli */}
            <div className="md:col-span-2 space-y-4">
              {items.map((it) => (
                <Card key={it.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{it.contentTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        Tipo: {String(it.ticketType).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Diminuisci quantità"
                        onClick={() => updateQty(it.id, Math.max(1, it.quantity - 1))}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        className="w-16 text-center"
                        min={1}
                        max={10}
                        value={it.quantity}
                        onChange={(e) =>
                          updateQty(it.id, parseInt(e.target.value) || 1)
                        }
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Aumenta quantità"
                        onClick={() => updateQty(it.id, Math.min(10, it.quantity + 1))}
                      >
                        +
                      </Button>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">
                        {centsToEur(it.unitPriceCents * it.quantity)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {centsToEur(it.unitPriceCents)} cad.
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      aria-label="Rimuovi articolo"
                      onClick={() => removeItem(it.id)}
                    >
                      Rimuovi
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Riepilogo */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Riepilogo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Articoli</span>
                    <span>{count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotale</span>
                    <span>{formattedSubtotal}</span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Le commissioni e le tasse saranno calcolate nel passaggio successivo.
                  </div>

                  {!user && (
                    <div className="space-y-2">
                      <Label htmlFor="buyerEmail">Email</Label>
                      <Input
                        id="buyerEmail"
                        type="email"
                        placeholder="la-tua-email@example.com"
                        value={buyerEmail}
                        onChange={(e) => {
                          setBuyerEmail(e.target.value)
                          setEmailError('')
                        }}
                      />
                      {emailError && (
                        <div className="text-xs text-red-600">{emailError}</div>
                      )}
                    </div>
                  )}

                  {/* Quote breakdown */}
                  {quoteLoading && (
                    <div className="text-xs text-muted-foreground">
                      Calcolo commissioni…
                    </div>
                  )}

                  {quote && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Commissioni servizio</span>
                        <span>{centsToEur(quote.serviceFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commissioni pagamento</span>
                        <span>{centsToEur(quote.paymentFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasse/IVA</span>
                        <span>{centsToEur(quote.tax)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Totale stimato</span>
                        <span>{centsToEur(quote.total)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={checkout}
                    disabled={loading || !canCheckout}
                  >
                    {loading ? 'Attendere…' : 'Procedi al Checkout'}
                  </Button>

                  <Button className="w-full" variant="ghost" onClick={clear}>
                    Svuota Carrello
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Utility per formattazione Euro
function centsToEur(cents = 0) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(cents / 100)
}
