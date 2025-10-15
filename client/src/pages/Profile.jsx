import { useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import ProfileForm from '@/components/ProfileForm';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Heart, Settings } from 'lucide-react';

/**
 * Profile page - Two-column layout with avatar/bio and settings
 * Features: Edit profile, preferences, history, favorites
 */
export default function Profile() {
  const { user, updateUser, token } = useUserStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in
  if (!user || !token) {
    setLocation('/login');
    return null;
  }

  const handleUpdateProfile = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('PUT', `/api/user/${user.id}`, data);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Aggiornamento fallito');
      }

      updateUser(result.user);

      toast({
        title: 'Profilo aggiornato!',
        description: 'Le modifiche sono state salvate con successo',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare il profilo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold mb-2" data-testid="text-profile-header">
            Il Tuo Profilo
          </h1>
          <p className="text-muted-foreground">
            Gestisci le tue informazioni personali e preferenze
          </p>
        </div>

        {/* Two-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Form */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Informazioni Personali</h2>
              <ProfileForm user={user} onSubmit={handleUpdateProfile} isLoading={isLoading} />
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="history" className="space-y-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
                  <Clock className="h-4 w-4" />
                  Cronologia
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-2" data-testid="tab-favorites">
                  <Heart className="h-4 w-4" />
                  Preferiti
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center gap-2" data-testid="tab-preferences">
                  <Settings className="h-4 w-4" />
                  Preferenze
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <Card className="p-8">
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nessuna cronologia</h3>
                    <p className="text-muted-foreground">
                      I contenuti che visualizzi appariranno qui
                    </p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="favorites">
                <Card className="p-8">
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nessun preferito</h3>
                    <p className="text-muted-foreground">
                      Salva i tuoi spettacoli preferiti per rivederli
                    </p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Preferenze Feed</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Categorie Preferite
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Drammatico', 'Commedia', 'Balletto', 'Opera'].map((genre) => (
                          <Badge 
                            key={genre} 
                            variant="outline" 
                            className="cursor-pointer hover-elevate"
                            data-testid={`badge-preference-${genre.toLowerCase()}`}
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Ordinamento Predefinito
                      </label>
                      <select className="w-full border-2 border-border rounded-md p-2">
                        <option>Più Recenti</option>
                        <option>Consigliati</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
