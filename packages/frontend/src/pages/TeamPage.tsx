import React, { useEffect, useState } from 'react';
import { TeamManagement } from '@/components/TeamManagement';
import api from '@/services/api';

export const TeamPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
      if (userRes.data.team) {
        const teamRes = await api.get(`/teams/${userRes.data.team.id}`);
        setTeam(teamRes.data);
      } else {
        setTeam(null);
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Team Data...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black font-outfit text-white tracking-wide">TEAM COMMAND CENTER</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          {team ? 'Manage your squad members, view solved challenges, and coordinate attack strategies.' : 'Form a cyber squad or join an existing team using an invitation code.'}
        </p>
      </div>

      <TeamManagement user={user} team={team} onUpdate={fetchData} />
    </div>
  );
};
