import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { ChallengeCrud } from '@/components/admin/ChallengeCrud';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chalRes, eventsRes, catRes] = await Promise.all([
        api.get('/admin/challenges'),
        api.get('/admin/events'),
        api.get('/admin/categories')
      ]);
      setChallenges(chalRes.data || []);
      setEvents(eventsRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      toast.error('Failed to load challenges data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Challenge Management & Deployments
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {challenges.length} Challenges
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Author, configure flag keys, assign points rewards, and manage challenge activations across arenas.
            </p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Challenges...</div>
      ) : (
        <ChallengeCrud 
          challenges={challenges} 
          events={events} 
          categories={categories}
          onRefresh={fetchData} 
        />
      )}
    </div>
  );
};
