import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';


export default function SellerContents() {
  const { user, token } = useUserStore();
  const { toast } = useToast();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(null);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      duration: '',
      tags: '',
      vrUrl: '',
      eventType: '',
      startDatetime: '',
      availableUntil: '',
      availableTickets: '',
      totalTickets: '',
      unlimitedTickets: '',
      ticketPriceStandard: '',
      ticketPriceVip: '',
      ticketPricePremium: '',
    },
  });

  useEffect(() => {
    if (!user || !token) return;
    fetchContents();
  }, [user, token]);

  async function fetchContents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contents?sellerId=${user.id}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setContents(data.contents || []);
    } catch (err) {
      toast({ title: 'Errore', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditContent(null);
    form.reset({
      title: '',
      description: '',
      imageUrl: '',
      duration: '',
      tags: '',
      vrUrl: '',
      eventType: '',
      startDatetime: '',
      availableUntil: '',
      availableTickets: '',
      totalTickets: '',
      unlimitedTickets: false,
      ticketPriceStandard: '',
      ticketPriceVip: '',
      ticketPricePremium: ''
    });
    setDialogOpen(true);
  }

  function openEdit(content) {
    setEditContent(content);
    form.reset({
      title: content.title || '',
      description: content.description || '',
      imageUrl: content.image_url || '',
      duration: content.duration?.toString() || '',
      tags: (() => {
        const t = content.tags;
        if (!t) return '';
        // If it's already an array
        if (Array.isArray(t)) return t.join(', ');
        // If it's a string, it might be a JSON-stringified array like '["a"]' or a CSV
        if (typeof t === 'string') {
          const trimmed = t.trim();
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) return parsed.join(', ');
            } catch (e) {
              // fall through to return the raw string
            }
          }
          return trimmed;
        }
        return '';
      })(),
      vrUrl: content.vr_url || '',
      eventType: content.event_type || '',
      startDatetime: content.start_datetime || '',
      availableUntil: content.available_until || '',
      totalTickets: content.total_tickets?.toString() || '',
      unlimitedTickets: Boolean(content.unlimited_tickets || false),
      ticketPriceStandard: content.ticket_price_standard?.toString() || '',
      ticketPriceVip: content.ticket_price_vip?.toString() || '',
      ticketPricePremium: content.ticket_price_premium?.toString() || ''
    });
    setDialogOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('Sei sicuro di voler eliminare questo contenuto?')) return;
    try {
      const res = await apiRequest('DELETE', `/api/contents/${id}`);
      await res.json();
      setContents((c) => c.filter((x) => x.id !== id));
      toast({ title: 'Eliminato', description: 'Contenuto rimosso' });
    } catch (err) {
      toast({ title: 'Errore', description: err.message || String(err), variant: 'destructive' });
    }
  }

  async function onSubmit(values) {
    try {
      // Map camelCase to snake_case for backend compatibility
      const payload = {
        ...values,
        image_url: values.imageUrl,
        vr_url: values.vrUrl,
        duration: Number(values.duration),
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        event_type: values.eventType,
        start_datetime: values.startDatetime,
        available_until: values.availableUntil,
        unlimited_tickets: Boolean(values.unlimitedTickets),
        total_tickets: Number(values.totalTickets),
        ticket_price_standard: Number(values.ticketPriceStandard),
        ticket_price_vip: Number(values.ticketPriceVip),
        ticket_price_premium: Number(values.ticketPricePremium),
      };
      let res;
      if (editContent) {
        res = await apiRequest('PUT', `/api/contents/${editContent.id}`, payload);
      } else {
        res = await apiRequest('POST', '/api/contents', payload);
      }
      const data = await res.json();
      setDialogOpen(false);
      form.reset();
      fetchContents();
      toast({ title: editContent ? 'Contenuto aggiornato' : 'Contenuto creato' });
    } catch (err) {
      toast({ title: 'Errore', description: err.message || String(err), variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">I tuoi contenuti</h1>
          <Button onClick={openCreate}>Crea nuovo</Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editContent ? 'Modifica contenuto' : 'Crea nuovo contenuto'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-auto h-96 pr-2">
                <FormField name="title" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">Titolo</FormLabel>
                    <Input placeholder="Titolo" {...field} required />
                  </FormItem>
                )} />
                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">Descrizione</FormLabel>
                    <Textarea placeholder="Descrizione" {...field} required />
                  </FormItem>
                )} />
                <FormField name="imageUrl" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">URL immagine</FormLabel>
                    <Input placeholder="https://..." type="url" {...field} />
                  </FormItem>
                )} />
                <FormField name="duration" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Durata (minuti)</FormLabel>
                    <Input placeholder="Durata" type="number" min={1} {...field} required />
                  </FormItem>
                )} />
                <FormField name="tags" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">Tag (separati da virgola)</FormLabel>
                    <Input placeholder="es. teatro,dramma" {...field} />
                  </FormItem>
                )} />
                <FormField name="vrUrl" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">URL VR</FormLabel>
                    <Input placeholder="https://..." type="url" {...field} required />
                  </FormItem>
                )} />
                
                {/* Nuovi campi per il tipo di evento */}
                <FormField 
                  name="eventType" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Tipo di Evento</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        defaultValue={'live'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="onDemand">On Demand</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                {/* Campi per le date */}
                <FormField name="startDatetime" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Data e Ora Inizio</FormLabel>
                    <Input type="datetime-local" {...field} required />
                  </FormItem>
                )} />
                
                <FormField name="availableUntil" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Disponibile fino a</FormLabel>
                    <Input type="datetime-local" {...field} required />
                  </FormItem>
                )} />
                <FormField 
                  name="unlimitedTickets" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Biglietti Illimitati</FormLabel>
                      <input 
                        type="checkbox" 
                        checked={field.value} 
                        onChange={field.onChange} 
                        className="w-4 h-4" 
                      />
                    </FormItem>
                  )} 
                />
                <FormField 
                  name="totalTickets" 
                  control={form.control} 
                  render={({ field }) => {
                    const unlimitedTickets = form.watch("unlimitedTickets");
                    return(
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormLabel className={`w-44 min-w-44 ${unlimitedTickets && 'text-gray-400'}`}>Biglietti Totali</FormLabel>
                        <Input 
                          placeholder="100" 
                          type="number" 
                          min={0} 
                          {...field} 
                          required={!unlimitedTickets} // Non obbligatorio se illimitati
                          disabled={unlimitedTickets}
                        />
                      </FormItem>
                    );
                    }} 
                  />
                
                {/* Campi per i prezzi dei biglietti */}
                <FormField name="ticketPriceStandard" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Prezzo Standard €</FormLabel>
                    <Input placeholder="10,00" type="number" step={0.01} min={0} {...field} required />
                  </FormItem>
                )} />
                
                <FormField name="ticketPriceVip" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Prezzo VIP €</FormLabel>
                    <Input placeholder="25,00" type="number" step={0.01} min={0} {...field} required />
                  </FormItem>
                )} />
                
                <FormField name="ticketPricePremium" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-44 min-w-44">Prezzo Premium €</FormLabel>
                    <Input placeholder="50,00" type="number" step={0.01} min={0} {...field} required />
                  </FormItem>
                )} />
                
                <DialogFooter>
                  <Button type="submit">{editContent ? 'Salva modifiche' : 'Crea'}</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {loading ? (
          <Card className="p-8 text-center">Caricamento…</Card>
        ) : contents.length === 0 ? (
          <Card className="p-8 text-center">Nessun contenuto, crea il primo</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {contents.map((c) => (
              <Card key={c.id} className="p-4 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(c)}>Modifica</Button>
                  <Button variant="destructive" onClick={() => handleDelete(c.id)}>Elimina</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
