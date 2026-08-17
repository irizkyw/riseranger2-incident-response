import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import api from '@/services/api';

const COLORS = ['#00F0FF', '#00FF66', '#A855F7', '#FF007F', '#FACC15', '#38BDF8', '#4ADE80', '#F472B6', '#C084FC', '#FB923C'];

export const ScoreChart: React.FC<{ eventId: string | null }> = ({ eventId }) => {
  const [data, setData] = useState<any>({ teams: [], timeline: [] });
  const [loading, setLoading] = useState(true);

  const fetchChartData = async () => {
    try {
      if (!eventId) return;
      const res = await api.get(`/scoreboard/chart?event_id=${eventId}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    fetchChartData();
    const interval = setInterval(fetchChartData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [eventId]);

  if (loading) {
    return <div className="h-80 w-full flex items-center justify-center text-muted-foreground font-mono animate-pulse">Loading Graph Data...</div>;
  }

  if (!data.teams || data.teams.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center text-muted-foreground font-mono bg-black/40 rounded-lg border border-border/40">
        No active teams registered yet to generate progress graph.
      </div>
    );
  }

  return (
    <div className="w-full h-80 pt-4 bg-black/60 rounded-xl border border-border/50 p-2 sm:p-4 shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.timeline} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#666" 
            fontSize={11} 
            fontFamily="JetBrains Mono" 
            minTickGap={35}
            tickFormatter={(val) => {
              if (!val || val === 'Now') return val;
              // Format HH:MM if string contains time
              const parts = String(val).split(' ');
              return parts[0] ? parts[0].slice(0, 5) : val;
            }}
          />
          <YAxis stroke="#666" fontSize={11} fontFamily="JetBrains Mono" />
          <Tooltip
            contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', boxShadow: '0 8px 25px rgba(0,0,0,0.8)' }}
            itemStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
            labelStyle={{ color: '#00F0FF', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ fontFamily: 'Outfit', fontSize: '11px', paddingTop: '10px' }} />
          {data.teams.map((teamName: string, idx: number) => (
            <Line
              key={teamName}
              type="stepAfter"
              dataKey={teamName}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
