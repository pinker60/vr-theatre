import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function DBManager() {
  const { user, token } = useUserStore();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!user || !token) return;
    fetchUsers();
  }, [user, token]);

  async function fetchUsers() {
    try {
      const res = await apiRequest('GET', '/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast({ title: 'Errore', description: err.message || String(err), variant: 'destructive' });
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare utente?')) return;
    try {
      await apiRequest('DELETE', `/api/admin/users/${id}`);
      setUsers((u) => u.filter((x) => x.id !== id));
      toast({ title: 'Eliminato' });
    } catch (err) {
      toast({ title: 'Errore', description: err.message || String(err), variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">DB Manager</h1>
        </div>
        <Card className="p-4">
          {users.length === 0 ? (
            <div>Nessun utente</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.name} <span className="text-sm text-muted-foreground">{u.email}</span></div>
                    <div className="text-xs text-muted-foreground">Seller: {u.is_seller ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <Button variant="destructive" onClick={() => handleDelete(u.id)}>Elimina</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
