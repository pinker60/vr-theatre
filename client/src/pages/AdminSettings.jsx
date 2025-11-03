import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUserStore } from '@/store/useUserStore';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function AdminSettings() {
    const { user } = useUserStore();
    const [, setLocation] = useLocation();
    const form = useForm({ defaultValues: {
    companyName: '', companyEmail: '', companyAddress: '', supportEmail: '', appUrl: '',
    smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpFrom: '',
    facebookUrl: '', instagramUrl: '', twitterUrl: '', youtubeUrl: '',
    requireEmailVerification: true,
  }});

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

  async function onSubmit(values) {
    try {
      const res = await apiRequest('PUT', '/api/admin/settings', values);
      await res.json();
      alert('Impostazioni salvate');
    } catch (e) {
      alert((e && e.message) || String(e));
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
                    <Input {...field} />
                  </FormItem>
                )} />
                <FormField name="companyEmail" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email aziendale</FormLabel>
                    <Input type="email" {...field} />
                  </FormItem>
                )} />
                <FormField name="companyAddress" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <Input {...field} />
                  </FormItem>
                )} />
                <FormField name="supportEmail" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email supporto</FormLabel>
                    <Input type="email" {...field} />
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">Applicazione</h2>
                <FormField name="appUrl" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>APP URL</FormLabel>
                    <Input placeholder="https://example.com" {...field} />
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">SMTP</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="smtpHost" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host</FormLabel>
                      <Input {...field} />
                    </FormItem>
                  )} />
                  <FormField name="smtpPort" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porta</FormLabel>
                      <Input type="number" {...field} />
                    </FormItem>
                  )} />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="smtpUser" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Input {...field} />
                    </FormItem>
                  )} />
                  <FormField name="smtpPass" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <Input type="password" {...field} />
                    </FormItem>
                  )} />
                </div>
                <FormField name="smtpFrom" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mittente (From)</FormLabel>
                    <Input placeholder="no-reply@example.com" {...field} />
                  </FormItem>
                )} />
              </section>

              <section className="space-y-3">
                <h2 className="font-semibold">Social</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField name="facebookUrl" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <Input placeholder="https://facebook.com/..." {...field} />
                    </FormItem>
                  )} />
                  <FormField name="instagramUrl" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <Input placeholder="https://instagram.com/..." {...field} />
                    </FormItem>
                  )} />
                  <FormField name="twitterUrl" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X</FormLabel>
                      <Input placeholder="https://x.com/..." {...field} />
                    </FormItem>
                  )} />
                  <FormField name="youtubeUrl" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube</FormLabel>
                      <Input placeholder="https://youtube.com/..." {...field} />
                    </FormItem>
                  )} />
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
