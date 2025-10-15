import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import VRPlayer from '@/components/VRPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * VRMode page - Immersive VR content viewing
 * Dynamically loads content by ID from route params
 */
export default function VRMode() {
  const [, params] = useRoute('/vr/:id');
  const [, setLocation] = useLocation();
  const contentId = params?.id;

  // Fetch content by ID
  const { data: content, isLoading, error } = useQuery({
    queryKey: [`/api/contents/${contentId}`],
    enabled: !!contentId,
  });

  // Handle ESC key to exit
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Skeleton className="w-32 h-10 mb-6" />
          <Skeleton className="aspect-video w-full mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Contenuto non trovato</h2>
          <p className="text-muted-foreground mb-6">
            Il contenuto richiesto non è disponibile
          </p>
          <Button onClick={() => setLocation('/')} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        {/* VR Player */}
        <VRPlayer content={content} />
      </div>
    </div>
  );
}
