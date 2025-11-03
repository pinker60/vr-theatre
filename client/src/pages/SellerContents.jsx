import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { allowedTags } from '@/lib/tags';
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
      tags: [],
      vrUrl: '',
      // New fields
      eventType: 'ondemand',
      startDatetime: '', // datetime-local format
      availableUntil: '', // datetime-local format
      unlimitedTickets: false,
      totalTickets: 0,
      ticketPriceStandard: 0,
      ticketPriceVip: 0,
      ticketPricePremium: 0,
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
      tags: [],
      vrUrl: '',
      eventType: 'ondemand',
      startDatetime: '',
      availableUntil: '',
      unlimitedTickets: false,
      totalTickets: 0,
      ticketPriceStandard: 0,
      ticketPriceVip: 0,
      ticketPricePremium: 0,
    });
    setDialogOpen(true);
  }

  function openEdit(content) {
    setEditContent(content);
    form.reset({
      title: content.title || '',
      description: content.description || '',
      imageUrl: content.imageUrl || content.image_url || '',
      duration: content.duration?.toString() || '',
      tags: (() => {
        const t = content.tags;
        let arr = [];
        if (Array.isArray(t)) arr = t;
        else if (typeof t === 'string') {
          const s = t.trim();
          if (s.startsWith('[')) {
            try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) arr = parsed; } catch {}
          } else if (s.length) {
            arr = s.split(',').map(x => x.trim()).filter(Boolean);
          }
        }
        // keep only allowed
        const allowed = new Set(allowedTags.map(x => x.value));
        return arr.filter(x => allowed.has(x));
      })(),
      vrUrl: content.vrUrl || content.vr_url || '',
      eventType: content.eventType || content.event_type || 'ondemand',
      startDatetime: toLocalDatetimeInput(content.startDatetime || content.start_datetime),
      availableUntil: toLocalDatetimeInput(content.availableUntil || content.available_until),
      unlimitedTickets: !!(content.unlimitedTickets ?? content.unlimited_tickets),
      totalTickets: Number(content.totalTickets ?? content.total_tickets ?? 0),
      ticketPriceStandard: Number(content.ticketPriceStandard ?? content.ticket_price_standard ?? 0),
      ticketPriceVip: Number(content.ticketPriceVip ?? content.ticket_price_vip ?? 0),
      ticketPricePremium: Number(content.ticketPricePremium ?? content.ticket_price_premium ?? 0),
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
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
        await queryClient.refetchQueries({ queryKey: ['/api/contents'], type: 'active' });
      } catch {}
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
        // tags: array for API; sanitize against allowed list
        tags: Array.isArray(values.tags)
          ? values.tags.filter(t => allowedTags.some(a => a.value === t))
          : (values.tags ? String(values.tags).split(',').map((t) => t.trim()).filter(t => allowedTags.some(a => a.value === t)) : []),
        // pricing and event fields
        event_type: values.eventType,
        start_datetime: values.startDatetime ? new Date(values.startDatetime).toISOString() : null,
        available_until: values.availableUntil ? new Date(values.availableUntil).toISOString() : null,
        unlimited_tickets: !!values.unlimitedTickets,
        total_tickets: Number(values.totalTickets || 0),
        ticket_price_standard: Number(values.ticketPriceStandard || 0),
        ticket_price_vip: Number(values.ticketPriceVip || 0),
        ticket_price_premium: Number(values.ticketPricePremium || 0),
      };
      if (!payload.unlimited_tickets) {
        payload.available_tickets = payload.total_tickets;
      } else {
        payload.available_tickets = 0;
      }
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
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
        await queryClient.refetchQueries({ queryKey: ['/api/contents'], type: 'active' });
      } catch {}
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField name="tags" control={form.control} render={({ field }) => {
                  const selected = Array.isArray(field.value) ? field.value : [];
                  const toggle = (val) => {
                    const set = new Set(selected);
                    if (set.has(val)) set.delete(val); else set.add(val);
                    field.onChange(Array.from(set));
                  };
                  return (
                    <FormItem className="flex flex-col gap-2">
                      <FormLabel className="">Categorie evento</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {allowedTags.map(t => (
                          <label key={t.value} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer">
                            <Checkbox checked={selected.includes(t.value)} onCheckedChange={() => toggle(t.value)} />
                            <span>{t.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormItem>
                  );
                }} />
                <FormField name="vrUrl" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel className="w-28 min-w-28">URL VR</FormLabel>
                    <Input placeholder="https://..." type="url" {...field} required />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 gap-4">
                  <FormField name="eventType" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Tipo evento</FormLabel>
                      <select className="flex-1 border rounded-md h-10 px-3" {...field}>
                        <option value="ondemand">On‑demand</option>
                        <option value="live">Live</option>
                      </select>
                    </FormItem>
                  )} />
                  <FormField name="startDatetime" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Inizio (solo live)</FormLabel>
                      <Input type="datetime-local" className="flex-1" {...field} />
                    </FormItem>
                  )} />
                  <FormField name="availableUntil" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Disponibile fino al</FormLabel>
                      <Input type="datetime-local" className="flex-1" {...field} />
                    </FormItem>
                  )} />
                  <FormField name="unlimitedTickets" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Biglietti illimitati</FormLabel>
                      <Checkbox checked={!!field.value} onCheckedChange={(c) => field.onChange(!!c)} />
                    </FormItem>
                  )} />
                  <FormField name="totalTickets" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormLabel className="w-44 min-w-44">Biglietti totali</FormLabel>
                      <Input placeholder="0" type="number" min={0} disabled={form.watch('unlimitedTickets')} {...field} />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-rows-3 gap-3">
                    <FormField name="ticketPriceStandard" control={form.control} render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormLabel className="w-36 min-w-36">Prezzo Standard €</FormLabel>
                        <Input placeholder="0.00" type="number" step={0.01} min={0} {...field} />
                      </FormItem>
                    )} />
                    <FormField name="ticketPriceVip" control={form.control} render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormLabel className="w-36 min-w-36">Prezzo VIP €</FormLabel>
                        <Input placeholder="0.00" type="number" step={0.01} min={0} {...field} />
                      </FormItem>
                    )} />
                    <FormField name="ticketPricePremium" control={form.control} render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormLabel className="w-36 min-w-36">Prezzo Premium €</FormLabel>
                        <Input placeholder="0.00" type="number" step={0.01} min={0} {...field} />
                      </FormItem>
                    )} />
                  </div>
                </div>
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
                  <div className="mt-2 text-sm">
                    <p><span className="font-medium">Tipo:</span> {c.eventType || c.event_type}</p>
                    { (c.eventType === 'live' || c.event_type === 'live') && (
                      <p><span className="font-medium">Inizio:</span> {formatDateTime(c.startDatetime || c.start_datetime)}</p>
                    )}
                    { (c.availableUntil || c.available_until) && (
                      <p><span className="font-medium">Disponibile fino al:</span> {formatDateTime(c.availableUntil || c.available_until)}</p>
                    )}
                    <p>
                      <span className="font-medium">Biglietti:</span> {c.unlimitedTickets || c.unlimited_tickets ? 'Illimitati' : `${c.availableTickets ?? c.available_tickets ?? 0}/${c.totalTickets ?? c.total_tickets ?? 0}`}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Prezzi:</span>
                      <span className="ml-2">Std €{(c.ticketPriceStandard ?? c.ticket_price_standard ?? 0).toFixed?.(2) ?? Number(c.ticketPriceStandard ?? c.ticket_price_standard ?? 0).toFixed(2)}</span>
                      <span className="ml-2">VIP €{(c.ticketPriceVip ?? c.ticket_price_vip ?? 0).toFixed?.(2) ?? Number(c.ticketPriceVip ?? c.ticket_price_vip ?? 0).toFixed(2)}</span>
                      <span className="ml-2">Prem €{(c.ticketPricePremium ?? c.ticket_price_premium ?? 0).toFixed?.(2) ?? Number(c.ticketPricePremium ?? c.ticket_price_premium ?? 0).toFixed(2)}</span>
                    </p>
                  </div>
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

// Helpers
function toLocalDatetimeInput(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return '';
  }
}

function formatDateTime(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}
