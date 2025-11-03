import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Loader2 } from 'lucide-react';
import defaultCover from '@/assets/default-theatre.jpg';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useCartStore } from '@/store/useCartStore';

/**
 * TicketPurchase page - Acquisto biglietti per eventi
 * Mostra dettagli evento e processa l'acquisto
 */
export default function TicketPurchase() {
  const [, params] = useRoute('/vr/buy/:id');
  const [, setLocation] = useLocation();
  const contentId = params?.id;
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState('standard');
  const [buyerEmail, setBuyerEmail] = useState('');
  const { user } = useUserStore();
  const addToCart = useCartStore((s) => s.addItem);

  // Fetch evento by ID
  const { data: event, isLoading, error } = useQuery({
    queryKey: [`/api/contents/${contentId}`],
    enabled: !!contentId,
  });

  // Tipi di biglietto disponibili (dinamici in base all'evento)
  const ticketTypes = [
    { id: 'standard', name: 'Biglietto Standard', price: Number(event?.ticketPriceStandard ?? event?.ticket_price_standard ?? 0) },
    { id: 'vip', name: 'Biglietto VIP', price: Number(event?.ticketPriceVip ?? event?.ticket_price_vip ?? 0) },
    { id: 'premium', name: 'Biglietto Premium', price: Number(event?.ticketPricePremium ?? event?.ticket_price_premium ?? 0) }
  ].filter(t => t.price >= 0);

  const selectedTicket = ticketTypes.find(ticket => ticket.id === selectedTicketType);
  const totalPrice = selectedTicket ? selectedTicket.price * ticketCount : 0;

  const handlePurchase = async () => {
    try {
      const payload = {
        contentId,
        ticketType: selectedTicketType,
        quantity: ticketCount,
        method: 'stripe',
        buyerEmail: user?.email || buyerEmail || undefined,
      };
      const res = await apiRequest('POST', '/api/purchase', payload);
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.tickets) {
        alert(`Acquisto completato! Codici biglietto: ${data.tickets.map(t => t.code).join(', ')}`);
        setLocation('/');
      } else {
        alert(data.message || 'Operazione completata');
      }
    } catch (e) {
      alert((e && e.message) || String(e));
    }
  };

  const handleAddToCart = () => {
    if (!selectedTicket) return;
    addToCart({
      contentId,
      contentTitle: event.title,
      ticketType: selectedTicketType,
      unitPriceCents: Math.round(Number(selectedTicket.price || 0) * 100),
      quantity: ticketCount,
    });
    alert('Aggiunto al carrello');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Skeleton className="w-32 h-10 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Evento non trovato</h2>
          <p className="text-muted-foreground mb-6">
            L'evento richiesto non è disponibile o è scaduto
          </p>
          <Button onClick={() => setLocation('/')} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna agli Eventi
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Sezione Informazioni Evento */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {(event.eventType || event.event_type || 'ondemand').toUpperCase()}
                    </Badge>
                    <CardTitle className="text-3xl font-bold">{event.title}</CardTitle>
                  </div>
                  <Badge variant={(event.unlimitedTickets || event.unlimited_tickets || (event.availableTickets ?? event.available_tickets) > 0) ? "default" : "destructive"}>
                    { (event.unlimitedTickets || event.unlimited_tickets) ? 'Posti illimitati' : ((event.availableTickets ?? event.available_tickets) > 0 ? `${event.availableTickets ?? event.available_tickets} posti disponibili` : 'Esaurito') }
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateTime(event.startDatetime || event.start_datetime) || 'On‑demand'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{event.duration ? `${event.duration} min` : '—'}</span>
                </div>
                {/* Nessuna location in schema corrente; rimuoviamo la riga */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{(event.unlimitedTickets || event.unlimited_tickets) ? 'Illimitati' : `${event.availableTickets ?? event.available_tickets ?? 0}/${event.totalTickets ?? event.total_tickets ?? 0}`}</span>
                </div>

                <div className="pt-4">
                  <h3 className="font-semibold mb-2">Descrizione Evento</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Immagine Evento */}
            <Card>
              <CardContent className="p-0">
                <img 
                  src={event.imageUrl || event.image_url || defaultCover} 
                  alt={event.title}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => { e.currentTarget.src = defaultCover; }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sezione Acquisto Biglietti */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acquista Biglietti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selezione Tipo Biglietto */}
                <div className="space-y-3">
                  <Label>Tipologia Biglietto</Label>
                  <div className="grid gap-2">
                    {ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedTicketType === ticket.id
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setSelectedTicketType(ticket.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{ticket.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Include accesso all'evento{ticket.id !== 'standard' ? ` + benefici ${ticket.id.toUpperCase()}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">€{ticket.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email (ospite) */}
                {!user && (
                  <div className="space-y-3">
                    <Label htmlFor="buyerEmail">Email</Label>
                    <Input id="buyerEmail" type="email" placeholder="la-tua-email@example.com" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                  </div>
                )}

                {/* Selezione Quantità */}
                <div className="space-y-3">
                  <Label htmlFor="ticketCount">Quantità</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
                      disabled={ticketCount <= 1}
                    >
                      -
                    </Button>
                    <Input
                      id="ticketCount"
                      type="number"
                      min="1"
                      max="10"
                      value={ticketCount}
                      onChange={(e) => setTicketCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setTicketCount(prev => Math.min(10, prev + 1))}
                      disabled={ticketCount >= 10}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Riepilogo Prezzo */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Biglietto {selectedTicket?.name} × {ticketCount}</span>
                    <span>€{(selectedTicket?.price || 0) * ticketCount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Totale</span>
                    <span>€{totalPrice}</span>
                  </div>
                </div>

                {/* Azioni */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="secondary"
                    onClick={handleAddToCart}
                    disabled={!selectedTicket}
                  >
                    Aggiungi al Carrello
                  </Button>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handlePurchase}
                    disabled={!(event.unlimitedTickets || event.unlimited_tickets || (event.availableTickets ?? event.available_tickets) > 0)}
                  >
                    {(event.unlimitedTickets || event.unlimited_tickets || (event.availableTickets ?? event.available_tickets) > 0) ? (
                      `Acquista - €${totalPrice}`
                    ) : (
                      'Biglietti Esauriti'
                    )}
                  </Button>
                </div>

                {/* Informazioni aggiuntive */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• I biglietti sono nominativi e non rimborsabili</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('it-IT');
  } catch {
    return String(iso);
  }
}