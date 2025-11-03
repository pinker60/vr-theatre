import { useState } from 'react';
import { useLocation } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AuthForm from '@/components/AuthForm';
import { Card } from '@/components/ui/card';
import { Film } from 'lucide-react';

/**
 * Register page - Split layout with registration form and hero image
 */
export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useUserStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        theater: data.theater || null,
        gdprConsent: data.gdprConsent,
        marketingConsent: data.marketingConsent || false,
        notificationsConsent: data.notificationsConsent || false,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registrazione fallita');
      }

      login(result.user, result.token);

      toast({
        title: 'Registrazione completata!',
        description: 'Il tuo account è stato creato con successo',
      });

      setLocation('/');
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile completare la registrazione',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        {/* Form Section */}
        <div className="flex items-center justify-center p-8 md:p-12">
          <Card className="w-full max-w-md p-8 shadow-2xl">
            <div className="mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Film className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-serif font-bold text-center mb-2" data-testid="text-register-title">
                Crea Account
              </h1>
              <p className="text-center text-muted-foreground">
                Inizia la tua esperienza VR Theatre
              </p>
            </div>

            <AuthForm type="register" onSubmit={handleRegister} isLoading={isLoading} />
          </Card>
        </div>

        {/* Hero Image Section */}
        <div className="hidden lg:block relative bg-gradient-to-br from-primary via-primary/90 to-vr-overlay">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white">
              <h2 className="text-4xl font-serif font-bold mb-4">
                Unisciti alla Rivoluzione
              </h2>
              <p className="text-lg text-white/90 max-w-md mx-auto mb-8">
                Accedi a contenuti esclusivi e vivi il teatro in una nuova dimensione
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-2xl font-bold">100+</p>
                  <p className="text-sm text-white/80">Spettacoli VR</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-2xl font-bold">50+</p>
                  <p className="text-sm text-white/80">Teatri Partner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
