import { useState } from 'react';
import { useLocation } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AuthForm from '@/components/AuthForm';
import { Card } from '@/components/ui/card';
import { Film } from 'lucide-react';

/**
 * Login page - Split layout with form and hero image
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useUserStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login fallito');
      }

      login(result.user, result.token);

      toast({
        title: 'Accesso effettuato!',
        description: `Benvenuto ${result.user.name}`,
      });

      setLocation('/');
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.message || 'Credenziali non valide',
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
              <h1 className="text-3xl font-serif font-bold text-center mb-2" data-testid="text-login-title">
                Bentornato
              </h1>
              <p className="text-center text-muted-foreground">
                Accedi al tuo account VR Theatre
              </p>
            </div>

            <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} />
          </Card>
        </div>

        {/* Hero Image Section */}
        <div className="hidden lg:block relative bg-gradient-to-br from-primary via-primary/90 to-vr-overlay">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white">
              <h2 className="text-4xl font-serif font-bold mb-4">
                Il Teatro del Futuro
              </h2>
              <p className="text-lg text-white/90 max-w-md mx-auto">
                Vivi esperienze teatrali immersive come mai prima d'ora
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
