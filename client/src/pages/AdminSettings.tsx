import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUserStore } from '@/store/useUserStore';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { FiFacebook, FiInstagram, FiMail } from 'react-icons/fi';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';

type SettingsForm = {
  companyName?: string;
  companyEmail?: string;
  companyAddress?: string;
  supportEmail?: string;
  appUrl?: string;
  smtpHost?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  requireEmailVerification?: boolean;
  feeFixedCents?: number | string;
  feePercent?: number | string;
  paymentFeeFixedCents?: number | string;
  paymentFeePercent?: number | string;
  taxPercent?: number | string;
};

export default function AdminSettings() {
  const { user } = useUserStore();
  const [, setLocation] = useLocation();
  const form = useForm<SettingsForm>({ defaultValues: {
    companyName: '', companyEmail: '', companyAddress: '', supportEmail: '', appUrl: '',
    smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpFrom: '',
    facebookUrl: '', instagramUrl: '', twitterUrl: '', youtubeUrl: '',
    requireEmailVerification: true,
    feeFixedCents: 0,
    feePercent: 0,
    paymentFeeFixedCents: 0,
    paymentFeePercent: 0,
    taxPercent: 0,
  }});
  const [sendingTest, setSendingTest] = useState(false);
  const [testTo, setTestTo] = useState<string>('');

  const isValidUrl = (v?: string) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!user.isAdmin) { setLocation('/'); return; }
    (async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/settings');
        const data = await res.json();
        if (data?.settings) form.reset({ ...form.getValues(), ...data.settings });
      } catch (e) { /* ignore */ }
    })();
  }, [user]);

  async function onSubmit(values: SettingsForm) {
    try {
      const res = await apiRequest('PUT', '/api/admin/settings', values);
      await res.json();
      alert('Impostazioni salvate');
    } catch (e: any) {
      alert((e && e.message) || String(e));
    }
  }

  async function sendTestEmail() {
    try {
      setSendingTest(true);
      const to = testTo || form.getValues('supportEmail') || form.getValues('companyEmail') || '';
      const res = await apiRequest('POST', '/api/admin/settings/test-email', { to });
      const data = await res.json();
      alert(`Email di test inviata a ${data?.sentTo || to}`);
    } catch (e: any) {
      alert(e?.message || 'Invio test fallito');
    } finally {
      setSendingTest(false);
    }
  }

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6">
        <h1 className="text-2xl font-semibold">Impostazioni sito</h1>
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <section className="space-y-3">
                <h2 className="font-semibold">Dati Aziendali</h2>
                <FormField name="companyName" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ragione sociale</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField name="companyEmail" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email aziendale</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField name="companyAddress" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField name="supportEmail" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email supporto</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">Applicazione</h2>
                <FormField name="appUrl" control={form.control} rules={{ validate: (v) => isValidUrl(v) || 'URL non valido' }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>APP URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="requireEmailVerification" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                    </FormControl>
                    <FormLabel className="!mt-0">Richiedi verifica email agli utenti</FormLabel>
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">Commissioni e Tasse</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="feeFixedCents" control={form.control} rules={{ min: { value: 0, message: 'Deve essere >= 0' } }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee fissa (cent)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="feePercent" control={form.control} rules={{ min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee percentuale (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" max="100" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="paymentFeeFixedCents" control={form.control} rules={{ min: { value: 0, message: 'Deve essere >= 0' } }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee pagamento fissa (cent)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="paymentFeePercent" control={form.control} rules={{ min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee pagamento percentuale (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" max="100" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField name="taxPercent" control={form.control} rules={{ min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA/Tax (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">SMTP</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="smtpHost" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField name="smtpPort" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porta</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="smtpUser" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField name="smtpPass" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField name="smtpFrom" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mittente (From)</FormLabel>
                    <FormControl>
                      <Input placeholder="no-reply@example.com" {...field} />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="flex items-end gap-2 pt-2">
                  <div className="flex-1">
                    <FormLabel>Invia email di test a</FormLabel>
                    <Input placeholder="you@example.com (opzionale)" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                  </div>
                  <Button type="button" onClick={sendTestEmail} disabled={sendingTest} className="h-10 mt-6">{sendingTest ? 'Invio…' : 'Test'}</Button>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">Social</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="facebookUrl" control={form.control} rules={{ validate: (v) => isValidUrl(v) || 'URL non valido' }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="instagramUrl" control={form.control} rules={{ validate: (v) => isValidUrl(v) || 'URL non valido' }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="twitterUrl" control={form.control} rules={{ validate: (v) => isValidUrl(v) || 'URL non valido' }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X</FormLabel>
                      <FormControl>
                        <Input placeholder="https://x.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="youtubeUrl" control={form.control} rules={{ validate: (v) => isValidUrl(v) || 'URL non valido' }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Anteprima */}
                <div className="pt-2">
                  <div className="text-sm text-muted-foreground mb-2">Anteprima Connect</div>
                  <div className="flex gap-3">
                    {(form.watch('supportEmail') || form.watch('companyEmail')) && (
                      <a href={`mailto:${form.watch('supportEmail') || form.watch('companyEmail')}`} className="p-2 rounded-md hover-elevate" aria-label="Email">
                        <FiMail className="h-5 w-5" />
                      </a>
                    )}
                    {form.watch('facebookUrl') && isValidUrl(form.watch('facebookUrl')) && (
                      <a href={form.watch('facebookUrl')} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover-elevate" aria-label="Facebook">
                        <FiFacebook className="h-5 w-5" />
                      </a>
                    )}
                    {form.watch('instagramUrl') && isValidUrl(form.watch('instagramUrl')) && (
                      <a href={form.watch('instagramUrl')} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover-elevate" aria-label="Instagram">
                        <FiInstagram className="h-5 w-5" />
                      </a>
                    )}
                    {form.watch('twitterUrl') && isValidUrl(form.watch('twitterUrl')) && (
                      <a href={form.watch('twitterUrl')} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover-elevate" aria-label="X">
                        <FaXTwitter className="h-5 w-5" />
                      </a>
                    )}
                    {form.watch('youtubeUrl') && isValidUrl(form.watch('youtubeUrl')) && (
                      <a href={form.watch('youtubeUrl')} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover-elevate" aria-label="YouTube">
                        <FaYoutube className="h-5 w-5" />
                      </a>
                    )}
                    
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
