import { useEffect, useRef, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';

export default function Redeem() {
  const [, params] = useRoute('/vr/redeem/:id');
  const [, setLocation] = useLocation();
  const contentId = params?.id;
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Assicura che la pagina parta dall'alto e focalizza l'input
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    inputRef.current?.focus();
  }, []);

  const handleRedeem = async () => {
    if (!code.trim()) return alert('Inserisci un codice');
    try {
      setSubmitting(true);
      const res = await apiRequest('POST', '/api/redeem', { contentId, code });
      const data = await res.json();
      if (data?.ok) {
        alert('Voucher valido! Buona visione.');
        setLocation(`/vr/${contentId}`);
      } else {
        alert('Codice non valido');
      }
    } catch (e) {
      alert((e && e.message) || 'Redeem fallito');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Hai già il biglietto?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Inserisci il tuo voucher per procedere.</p>
            <Input ref={inputRef} placeholder="Codice voucher" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button onClick={handleRedeem} className="w-full" disabled={submitting}>{submitting ? 'Verifica…' : 'Conferma'}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
