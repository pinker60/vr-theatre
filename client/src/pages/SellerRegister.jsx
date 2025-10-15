import { useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Store, Check, Loader2, Lock, CreditCard } from 'lucide-react';

/**
 * SellerRegister page - Multi-step seller registration with Stripe
 * Features: Progress indicator, Stripe test mode integration
 */

const sellerSchema = z.object({
  companyName: z.string().min(1, 'Ragione sociale richiesta'),
  vatNumber: z.string().min(11, 'Partita IVA deve essere almeno 11 caratteri'),
  contactEmail: z.string().email('Email non valida'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Devi accettare i termini e condizioni'
  }),
});

export default function SellerRegister() {
  const { user, token, updateUser } = useUserStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      termsAccepted: false,
      companyName: user?.theater || '',
      contactEmail: user?.email || '',
    },
  });

  const termsAccepted = watch('termsAccepted');

  // Redirect if not logged in
  if (!user || !token) {
    setLocation('/login');
    return null;
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/register', {
        userId: user.id,
        companyName: data.companyName,
        vatNumber: data.vatNumber,
        contactEmail: data.contactEmail,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registrazione fallita');
      }

      // Update user with seller status
      updateUser({ 
        isSeller: true,
        stripeId: result.stripeAccountId 
      });

      setIsSuccess(true);

      toast({
        title: 'Richiesta inviata con successo!',
        description: 'Il tuo account venditore è in fase di verifica',
      });

      setTimeout(() => {
        setLocation('/profile');
      }, 3000);

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

  const steps = [
    { id: 1, title: 'Info Teatro', icon: Store },
    { id: 2, title: 'Dati Fiscali', icon: CreditCard },
    { id: 3, title: 'Stripe Connect', icon: Lock },
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
        <Card className="max-w-md p-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-success-green/20 flex items-center justify-center animate-fade-in">
              <Check className="h-10 w-10 text-success-green" />
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold mb-4" data-testid="text-success-title">
            Richiesta Inviata!
          </h2>
          <p className="text-muted-foreground mb-6">
            Il tuo account venditore è stato creato con successo e sarà verificato a breve.
          </p>
          <Badge className="bg-spotlight-gold text-black">
            Modalità Test Stripe Attivata
          </Badge>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4" data-testid="text-seller-register-title">
            Diventa Venditore VR Theatre
          </h1>
          <p className="text-muted-foreground">
            Condividi le tue produzioni teatrali con il mondo
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between items-center relative">
            {/* Progress Bar Background */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-border -z-10" />
            <div 
              className="absolute top-5 left-0 h-1 bg-primary transition-all duration-500 -z-10"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((s, index) => (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center transition-all
                  ${step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {step > s.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <p className={`mt-2 text-xs font-medium ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Theatre Info */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Ragione Sociale / Nome Teatro *</Label>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="Teatro alla Scala S.r.l."
                    data-testid="input-company-name"
                    className="border-2 focus:border-primary"
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive" data-testid="error-company-name">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email Contatto *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...register('contactEmail')}
                    placeholder="contatti@teatro.it"
                    data-testid="input-contact-email"
                    className="border-2 focus:border-primary"
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-destructive" data-testid="error-contact-email">
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full"
                  data-testid="button-next-step-1"
                >
                  Continua
                </Button>
              </div>
            )}

            {/* Step 2: Tax Details */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">Partita IVA *</Label>
                  <Input
                    id="vatNumber"
                    {...register('vatNumber')}
                    placeholder="12345678901"
                    data-testid="input-vat-number"
                    className="border-2 focus:border-primary font-mono"
                  />
                  {errors.vatNumber && (
                    <p className="text-sm text-destructive" data-testid="error-vat-number">
                      {errors.vatNumber.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    data-testid="button-back-step-2"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1"
                    data-testid="button-next-step-2"
                  >
                    Continua
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Stripe & Terms */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                {/* Stripe Test Mode Info */}
                <div className="bg-spotlight-gold/10 border-2 border-spotlight-gold/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-spotlight-gold mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-spotlight-gold mb-1">
                        Modalità Test Stripe
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        La registrazione verrà effettuata in modalità test sicura. 
                        Nessun addebito reale verrà effettuato.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="termsAccepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setValue('termsAccepted', checked)}
                    data-testid="checkbox-terms"
                    className="mt-1"
                  />
                  <Label 
                    htmlFor="termsAccepted" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Accetto i{' '}
                    <a href="#" className="text-primary hover:underline font-medium">
                      Termini e Condizioni
                    </a>
                    {' '}per venditori e autorizzo la creazione di un account Stripe Connect *
                  </Label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-sm text-destructive" data-testid="error-terms">
                    {errors.termsAccepted.message}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    data-testid="button-back-step-3"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                    disabled={isLoading}
                    data-testid="button-submit-seller"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrazione...
                      </>
                    ) : (
                      'Completa Registrazione'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
