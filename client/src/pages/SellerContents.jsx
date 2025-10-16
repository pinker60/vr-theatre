import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
    form.reset({ title: '', description: '', imageUrl: '', duration: '', tags: '', vrUrl: '' });
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
        // Fallback: convert to string
        try {
          return String(t);
        } catch (e) {
          return '';
        }
      })(),
      vrUrl: content.vr_url || '',
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField name="title" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <Input placeholder="Titolo" {...field} required />
                  </FormItem>
                )} />
                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <Textarea placeholder="Descrizione" {...field} required />
                  </FormItem>
                )} />
                <FormField name="imageUrl" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL immagine</FormLabel>
                    <Input placeholder="https://..." type="url" {...field} required />
                  </FormItem>
                )} />
                <FormField name="duration" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata (minuti)</FormLabel>
                    <Input placeholder="Durata" type="number" min={1} {...field} required />
                  </FormItem>
                )} />
                <FormField name="tags" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag (separati da virgola)</FormLabel>
                    <Input placeholder="es. teatro,dramma" {...field} />
                  </FormItem>
                )} />
                <FormField name="vrUrl" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL VR</FormLabel>
                    <Input placeholder="https://..." type="url" {...field} required />
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
