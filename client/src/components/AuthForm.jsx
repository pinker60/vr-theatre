import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * AuthForm component - Reusable form for login and registration
 * Features: Validation, password visibility toggle, GDPR checkbox
 */

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password deve essere almeno 6 caratteri'),
});

const registerSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password deve essere almeno 6 caratteri'),
  confirmPassword: z.string(),
  theater: z.string().optional(),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: 'Devi accettare la privacy policy'
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

export default function AuthForm({ type = 'login', onSubmit, isLoading = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = type === 'login' ? loginSchema : registerSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      gdprConsent: false,
    },
  });

  const gdprConsent = watch('gdprConsent');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name (Register only) */}
      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Mario Rossi"
            data-testid="input-name"
            className="border-2 focus:border-primary"
          />
          {errors.name && (
            <p className="text-sm text-destructive" data-testid="error-name">
              {errors.name.message}
            </p>
          )}
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="mario@example.com"
          data-testid="input-email"
          className="border-2 focus:border-primary"
        />
        {errors.email && (
          <p className="text-sm text-destructive" data-testid="error-email">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder="••••••••"
            data-testid="input-password"
            className="border-2 focus:border-primary pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-password"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive" data-testid="error-password">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password (Register only) */}
      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Conferma Password *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="••••••••"
              data-testid="input-confirm-password"
              className="border-2 focus:border-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-confirm-password"
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive" data-testid="error-confirm-password">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      )}

      {/* Theater (Register only - optional) */}
      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="theater">Nome Teatro (opzionale)</Label>
          <Input
            id="theater"
            {...register('theater')}
            placeholder="Teatro alla Scala"
            data-testid="input-theater"
            className="border-2 focus:border-primary"
          />
        </div>
      )}

      {/* GDPR Consent (Register only) */}
      {type === 'register' && (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="gdprConsent"
              checked={gdprConsent}
              onCheckedChange={(checked) => setValue('gdprConsent', checked)}
              data-testid="checkbox-gdpr"
              className="mt-1"
            />
            <div className="flex-1">
              <Label 
                htmlFor="gdprConsent" 
                className="text-sm font-normal cursor-pointer"
              >
                Accetto la{' '}
                <Link href="/privacy">
                  <a className="text-primary hover:underline font-medium" data-testid="link-privacy">
                    Privacy Policy
                  </a>
                </Link>
                {' '}e il trattamento dei dati personali secondo GDPR *
              </Label>
            </div>
          </div>
          {errors.gdprConsent && (
            <p className="text-sm text-destructive" data-testid="error-gdpr">
              {errors.gdprConsent.message}
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-primary to-primary/80"
        disabled={isLoading}
        data-testid="button-submit"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {type === 'login' ? 'Accesso in corso...' : 'Registrazione in corso...'}
          </>
        ) : (
          type === 'login' ? 'Accedi' : 'Registrati'
        )}
      </Button>

      {/* Forgot Password (Login only) */}
      {type === 'login' && (
        <div className="text-center">
          <Link href="/reset-password">
            <a className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
              Password dimenticata?
            </a>
          </Link>
        </div>
      )}

      {/* Toggle between login/register */}
      <div className="text-center text-sm text-muted-foreground">
        {type === 'login' ? (
          <>
            Non hai un account?{' '}
            <Link href="/register">
              <a className="text-primary hover:underline font-medium" data-testid="link-register">
                Registrati
              </a>
            </Link>
          </>
        ) : (
          <>
            Hai già un account?{' '}
            <Link href="/login">
              <a className="text-primary hover:underline font-medium" data-testid="link-login">
                Accedi
              </a>
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
