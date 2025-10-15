import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * ProfileForm component - Edit user profile with avatar upload
 * Features: Image upload (base64), validation, verification badge
 */

const profileSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  theater: z.string().optional(),
});

export default function ProfileForm({ user, onSubmit, isLoading = false }) {
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      theater: user?.theater || '',
    },
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPreviewAvatar(base64String);
      setValue('avatar', base64String);
    };
    reader.readAsDataURL(file);
  };

  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      avatar: previewAvatar,
    });
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-32 w-32 ring-4 ring-primary/20">
            <AvatarImage src={previewAvatar} alt={user?.name} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {user?.isVerified && (
            <div className="absolute -bottom-1 -right-1">
              <Badge className="bg-success-green text-white border-2 border-background">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <Label 
            htmlFor="avatar-upload" 
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dashed border-border hover-elevate transition-all">
              <Camera className="h-4 w-4" />
              <span className="text-sm font-medium">Cambia Immagine</span>
            </div>
          </Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            data-testid="input-avatar"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG o GIF (max 2MB)
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Mario Rossi"
          data-testid="input-profile-name"
          className="border-2 focus:border-primary"
        />
        {errors.name && (
          <p className="text-sm text-destructive" data-testid="error-profile-name">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="mario@example.com"
          data-testid="input-profile-email"
          className="border-2 focus:border-primary"
          disabled
        />
        <p className="text-xs text-muted-foreground">
          L'email non può essere modificata
        </p>
        {errors.email && (
          <p className="text-sm text-destructive" data-testid="error-profile-email">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Theater */}
      <div className="space-y-2">
        <Label htmlFor="theater">Nome Teatro (opzionale)</Label>
        <Input
          id="theater"
          {...register('theater')}
          placeholder="Teatro alla Scala"
          data-testid="input-profile-theater"
          className="border-2 focus:border-primary"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-primary to-primary/80"
        disabled={isLoading}
        data-testid="button-save-profile"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvataggio...
          </>
        ) : (
          'Salva Modifiche'
        )}
      </Button>
    </form>
  );
}
