import { useRoute, useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Receipt() {
  const [, params] = useRoute('/receipt/:id')
  const [, setLocation] = useLocation()
  const id = params?.id
  const { data, isLoading, error } = useQuery({ queryKey: [`/api/order-group/${id}`], enabled: !!id })

  if (isLoading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center">Caricamento…</div>
  }
  if (error || !data?.group) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold">Ricevuta non trovata</div>
          <Button onClick={()=> setLocation('/')}>Torna alla Home</Button>
        </div>
      </div>
    )
  }

  const g = data.group
  return (
    <div className="min-h-screen pt-20 pb-20 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
        <h1 className="text-3xl font-bold">Ricevuta Ordine</h1>
        <div className="text-sm text-muted-foreground">Ordine: {g.id} • Stato: {g.status.toUpperCase()} • Email: {g.buyerEmail}</div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {g.items.map((it) => (
              <Card key={it.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.contentTitle}</div>
                    <div className="text-sm text-muted-foreground">{String(it.ticketType).toUpperCase()} × {it.quantity}</div>
                  </div>
                  <div className="font-semibold">{centsToEur(it.totalAmount)}</div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader><CardTitle>Biglietti (QR)</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 qr-grid">
                {g.tickets.map((t) => (
                  <div key={t.id} className="border rounded-md p-3 text-center qr-card">
                    <div className="text-xs text-muted-foreground mb-1">{t.code}</div>
                    <img src={`/api/tickets/${encodeURIComponent(t.code)}/qr`} alt={t.code} className="mx-auto qr-img" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader><CardTitle>Totali</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Row label="Subtotale" value={centsToEur(g.amounts.subtotal)} />
                <Row label="Commissioni" value={centsToEur(g.amounts.serviceFee + g.amounts.paymentFee)} />
                {!!g.amounts.tax && <Row label="Tasse" value={centsToEur(g.amounts.tax)} />}
                <div className="flex justify-between font-bold text-lg">
                  <span>Totale</span>
                  <span>{centsToEur(g.amounts.total)}</span>
                </div>
                <Button className="w-full" variant="ghost" onClick={()=> window.print()}>Stampa/Salva PDF</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>
}

function centsToEur(cents) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format((cents||0)/100)
}
