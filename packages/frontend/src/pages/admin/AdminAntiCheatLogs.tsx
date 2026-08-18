import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  AlertTriangle,
  Flame,
  Zap,
  Lock,
  Users,
  UserX,
  Ban,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Globe,
  Radio,
  Terminal,
  KeyRound,
  Activity,
  Eye,
  Filter,
  X,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/ui/TablePagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import api from '@/services/api';
import { formatWIBDateTime } from '@/utils/date';

interface SecurityLog {
  id: string;
  timestamp: string;
  type: 'BRUTE_FORCE' | 'IP_CONFLICT' | 'SPEED_ANOMALY' | 'MULTI_LOGIN' | 'FLAG_COLLISION' | 'AUDIT' | 'AUTH_FAILURE';
  severity: 'CRITICAL' | 'WARNING' | 'SUSPICIOUS' | 'INFO';
  title: string;
  details: string;
  ip?: string;
  user_id?: string;
  username?: string;
  team_id?: string;
  team_name?: string;
  challenge_id?: string;
  challenge_title?: string;
  event_id?: string;
  metadata?: any;
}

interface SummaryStats {
  total_triggers: number;
  critical_count: number;
  warning_count: number;
  ip_conflict_count: number;
  brute_force_count: number;
  speed_anomaly_count: number;
  multi_login_count: number;
}

export const AdminAntiCheatLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    total_triggers: 0, critical_count: 0, warning_count: 0,
    ip_conflict_count: 0, brute_force_count: 0, speed_anomaly_count: 0, multi_login_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean; action: 'BAN_TEAM' | 'FORCE_STOP_USER' | 'REVOKE_USER_SESSION' | null;
    log: SecurityLog | null; reason: string;
  }>({ open: false, action: null, log: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Detail / Inspect dialog
  const [detailLog, setDetailLog] = useState<SecurityLog | null>(null);

  // Clear dialog
  const [clearDialog, setClearDialog] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const fetchLogsRef = useRef<(silent?: boolean) => Promise<void>>(async () => { });

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/admin/anti-cheat/logs', {
        params: { type: selectedType, severity: selectedSeverity, search: search.trim(), page: currentPage, limit: pageSize }
      });
      if (res.data) {
        setLogs(res.data.logs || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.pagination) {
          setTotalItems(res.data.pagination.total_items || 0);
          setTotalPages(res.data.pagination.total_pages || 1);
        }
        setLastUpdate(new Date());
      }
    } catch (err: any) {
      if (!silent) toast.error('Gagal memuat log anti-cheat: ' + (err.response?.data?.error || err.message));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedType, selectedSeverity, search, currentPage, pageSize]);

  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Persistent Socket.IO real-time connection
  useEffect(() => {
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join-admin-room');
    };

    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    socket.on('disconnect', () => setIsConnected(false));

    // Real-time security events push
    socket.on('security_event', (newEvent: any) => {
      if (newEvent) {
        setLogs(prev => {
          const exists = prev.some(l => l.id === newEvent.id);
          if (exists) return prev;
          return [{
            id: newEvent.id || `live-${Date.now()}`,
            timestamp: newEvent.timestamp || new Date().toISOString(),
            type: newEvent.type || 'AUDIT',
            severity: newEvent.severity || 'WARNING',
            title: newEvent.title || 'Security Incident',
            details: newEvent.details || '',
            ip: newEvent.ip,
            user_id: newEvent.user_id,
            username: newEvent.username,
            team_id: newEvent.team_id,
            team_name: newEvent.team_name,
            challenge_id: newEvent.challenge_id,
            challenge_title: newEvent.challenge_title
          }, ...prev];
        });
        setSummary(prev => ({
          ...prev,
          total_triggers: prev.total_triggers + 1,
          critical_count: newEvent.severity === 'CRITICAL' ? prev.critical_count + 1 : prev.critical_count,
          warning_count: newEvent.severity === 'WARNING' ? prev.warning_count + 1 : prev.warning_count,
          brute_force_count: newEvent.type === 'BRUTE_FORCE' ? prev.brute_force_count + 1 : prev.brute_force_count,
          multi_login_count: newEvent.type === 'MULTI_LOGIN' ? prev.multi_login_count + 1 : prev.multi_login_count
        }));
        setLastUpdate(new Date());
      }
      fetchLogsRef.current(true);
    });

    // Re-fetch on all real-time events
    socket.on('live_activity_update', () => fetchLogsRef.current(true));
    socket.on('session_control_update', () => fetchLogsRef.current(true));
    socket.on('scoreboard_update', () => fetchLogsRef.current(true));
    socket.on('attack-result', () => fetchLogsRef.current(true));
    socket.on('first_blood_alert', () => fetchLogsRef.current(true));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleTakeAction = async () => {
    if (!actionDialog.action || !actionDialog.log) return;
    setActionLoading(true);
    try {
      const res = await api.post('/admin/anti-cheat/action', {
        action: actionDialog.action,
        team_id: actionDialog.log.team_id,
        user_id: actionDialog.log.user_id,
        challenge_id: actionDialog.log.challenge_id,
        reason: actionDialog.reason || `Anti-Cheat Trigger: ${actionDialog.log.title}`
      });
      toast.success(res.data?.message || 'Tindakan mitigasi berhasil!');
      setActionDialog({ open: false, action: null, log: null, reason: '' });
      fetchLogs(false);
    } catch (err: any) {
      toast.error('Gagal: ' + (err.response?.data?.error || err.message));
    } finally { setActionLoading(false); }
  };

  const handleClearLogs = async () => {
    setActionLoading(true);
    try {
      await api.delete('/admin/anti-cheat/logs/clear');
      toast.success('Security log file berhasil dibersihkan.');
      setClearDialog(false);
      fetchLogs(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal membersihkan log.');
    } finally { setActionLoading(false); }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) { toast.info('Tidak ada log untuk diekspor.'); return; }
    const headers = ['ID', 'Timestamp', 'Severity', 'Type', 'Title', 'Details', 'IP', 'User', 'Squad', 'Challenge'];
    const rows = logs.map(l => [
      l.id, formatWIBDateTime(l.timestamp), l.severity, l.type,
      `"${l.title.replace(/"/g, '""')}"`, `"${l.details.replace(/"/g, '""')}"`,
      l.ip || '-', l.username ? `@${l.username}` : '-', l.team_name || '-', l.challenge_title || '-'
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `anti_cheat_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Berhasil diekspor ke CSV!');
  };

  const getSeverityConfig = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'CRITICAL': return { dot: 'bg-red-400', ping: true, text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL' };
      case 'WARNING': return { dot: 'bg-amber-400', ping: false, text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'WARNING' };
      case 'SUSPICIOUS': return { dot: 'bg-yellow-400', ping: false, text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'SUSPICIOUS' };
      default: return { dot: 'bg-cyan-400', ping: false, text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'INFO' };
    }
  };

  const getTypeConfig = (type: SecurityLog['type']) => {
    switch (type) {
      case 'IP_CONFLICT': return { icon: Globe, color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'IP Collision' };
      case 'BRUTE_FORCE': return { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Brute Force' };
      case 'SPEED_ANOMALY': return { icon: Zap, color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Speed Anomaly' };
      case 'MULTI_LOGIN': return { icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Multi Session' };
      case 'AUTH_FAILURE': return { icon: KeyRound, color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Auth Failure' };
      default: return { icon: Terminal, color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-border/60', label: 'Audit Log' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase font-outfit flex items-center gap-2.5">
              Anti-Cheat & Security Logs
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Deteksi real-time: IP collision, flag brute-force, solve speed anomaly & multi-login sessions.
              {lastUpdate && <span className="ml-2 text-xs text-muted-foreground/60">Terakhir update: {formatWIBDateTime(lastUpdate.toISOString())}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(false)} disabled={loading} className="gap-1.5 text-xs font-bold border-border">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs border-border">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setClearDialog(true)} className="h-9 w-9 border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40" title="Bersihkan log file">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Triggers', value: summary.total_triggers, icon: Activity, color: 'text-foreground', border: 'border-border' },
          { label: 'Critical Threats', value: summary.critical_count, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'IP Collisions', value: summary.ip_conflict_count, icon: Globe, color: 'text-purple-400', border: 'border-purple-500/20' },
          { label: 'Brute Force', value: summary.brute_force_count, icon: Flame, color: 'text-orange-400', border: 'border-orange-500/20' },
          { label: 'Speed Anomaly', value: summary.speed_anomaly_count, icon: Zap, color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Session Kicks', value: summary.multi_login_count, icon: UserX, color: 'text-rose-400', border: 'border-rose-500/20' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border ${stat.border} bg-card p-4 flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <span className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-card rounded-xl border border-border p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari user, squad, challenge, IP, atau keyword insiden..."
            className="pl-9 h-9 text-xs font-mono"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedSeverity} onValueChange={v => { setSelectedSeverity(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[140px] text-xs font-mono">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="z-[10005]">
              <SelectItem value="ALL" className="text-xs font-mono">Semua Severity</SelectItem>
              <SelectItem value="CRITICAL" className="text-xs font-mono text-red-400">🔴 CRITICAL</SelectItem>
              <SelectItem value="WARNING" className="text-xs font-mono text-amber-300">🟡 WARNING</SelectItem>
              <SelectItem value="SUSPICIOUS" className="text-xs font-mono text-yellow-300">🟡 SUSPICIOUS</SelectItem>
              <SelectItem value="INFO" className="text-xs font-mono text-cyan-400">🔵 INFO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={v => { setSelectedType(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] text-xs font-mono">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent className="z-[10005]">
              <SelectItem value="ALL" className="text-xs font-mono">Semua Tipe</SelectItem>
              <SelectItem value="IP_CONFLICT" className="text-xs font-mono">🌐 IP Collision</SelectItem>
              <SelectItem value="BRUTE_FORCE" className="text-xs font-mono">🔥 Flag Brute Force</SelectItem>
              <SelectItem value="SPEED_ANOMALY" className="text-xs font-mono">⚡ Solve Anomaly</SelectItem>
              <SelectItem value="MULTI_LOGIN" className="text-xs font-mono">👤 Multi Session</SelectItem>
              <SelectItem value="AUTH_FAILURE" className="text-xs font-mono">🔑 Auth Failure</SelectItem>
              <SelectItem value="AUDIT" className="text-xs font-mono">📜 Admin Audit</SelectItem>
            </SelectContent>
          </Select>
          {(search || selectedSeverity !== 'ALL' || selectedType !== 'ALL') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSelectedSeverity('ALL'); setSelectedType('ALL'); setCurrentPage(1); }} className="text-xs font-mono text-muted-foreground gap-1">
              <X className="h-3 w-3" />Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="h-10 px-4 text-left text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider w-44 border-b border-r border-border/40">Waktu & Severity</th>
                <th className="h-10 px-4 text-left text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider w-44 min-w-[170px] border-b border-r border-border/40">Tipe Deteksi</th>
                <th className="h-10 px-4 text-left text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider min-w-[280px] border-b border-r border-border/40">Detail Insiden</th>
                <th className="h-10 px-4 text-left text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider w-40 border-b border-r border-border/40">Target</th>
                <th className="h-10 px-4 text-center text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider w-52 border-b border-border/40">Aksi Mitigasi</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-muted-foreground font-mono text-xs animate-pulse">
                  <Radio className="h-6 w-6 mx-auto mb-2 animate-spin" />Scanning security radar...
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-muted-foreground font-mono text-xs">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto" />
                    <span className="text-foreground font-bold text-sm">Semua Aman</span>
                    <span className="text-muted-foreground text-xs">Tidak ada insiden keamanan yang terdeteksi.</span>
                  </div>
                </td></tr>
              ) : (
                logs.map(log => {
                  const sev = getSeverityConfig(log.severity);
                  const typ = getTypeConfig(log.type);
                  const TypeIcon = typ.icon;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setDetailLog(log)}
                      className="group hover:bg-muted/20 transition-colors border-b border-border/40 cursor-pointer"
                      title="Klik baris untuk melihat detail lengkap insiden"
                    >
                      {/* Waktu & Severity */}
                      <td className="px-4 py-3 border-r border-border/30 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${sev.bg} ${sev.text} border ${sev.border} w-fit`}>
                            <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
                              {sev.ping && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sev.dot}`} />
                              )}
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${sev.dot}`} />
                            </span>
                            <span>{sev.label}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatWIBDateTime(log.timestamp)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Tipe */}
                      <td className="px-4 py-3 border-r border-border/30 align-top">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold whitespace-nowrap ${typ.bg} ${typ.color} border ${typ.border}`}>
                          <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{typ.label}</span>
                        </div>
                        {log.ip && (
                          <div className="mt-1.5 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <span>IP:</span>
                            <strong className="text-foreground font-mono">{log.ip}</strong>
                          </div>
                        )}
                      </td>

                      {/* Detail */}
                      <td className="px-4 py-3 border-r border-border/30 align-top">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">{log.title}</p>
                            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed mt-0.5 line-clamp-2">{log.details}</p>
                            {log.challenge_title && (
                              <span className="inline-block mt-1 text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                🎯 {log.challenge_title}
                              </span>
                            )}
                          </div>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 border-r border-border/30 align-top">
                        <div className="flex flex-col gap-1 text-xs font-mono">
                          {log.team_name && (
                            <div className="flex items-center gap-1.5 font-bold text-foreground" title={log.team_name}>
                              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[120px]">{log.team_name}</span>
                            </div>
                          )}
                          {log.username && (
                            <span className="text-cyan-400 text-[11px]">@{log.username}</span>
                          )}
                          {!log.team_name && !log.username && (
                            <span className="text-muted-foreground/40 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {log.team_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionDialog({ open: true, action: 'BAN_TEAM', log, reason: `Anti-Cheat: ${log.title}` });
                              }}
                              className="h-7 px-2 text-[10px] font-mono font-bold text-red-400 border-red-500/30 hover:bg-red-500/15 gap-1"
                            >
                              <Ban className="h-3 w-3" /> Ban Squad
                            </Button>
                          )}
                          {log.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionDialog({ open: true, action: 'FORCE_STOP_USER', log, reason: `Suspicious: ${log.title}` });
                              }}
                              className="h-7 px-2 text-[10px] font-mono text-amber-300 border-amber-500/30 hover:bg-amber-500/15 gap-1"
                            >
                              <Lock className="h-3 w-3" /> Lock
                            </Button>
                          )}
                          {log.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionDialog({ open: true, action: 'REVOKE_USER_SESSION', log, reason: `Session revoked: ${log.title}` });
                              }}
                              className="h-7 px-2 text-[10px] font-mono text-rose-300 border-rose-500/30 hover:bg-rose-500/15 gap-1"
                            >
                              <UserX className="h-3 w-3" /> Kick
                            </Button>
                          )}
                          {!log.team_id && !log.user_id && (
                            <span className="text-[11px] font-mono text-muted-foreground/40">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size: number) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {/* Detail / Inspect Modal */}
      <Dialog open={!!detailLog} onOpenChange={open => !open && setDetailLog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-outfit uppercase text-base">
              {detailLog && (() => {
                const typ = getTypeConfig(detailLog.type);
                const Icon = typ.icon;
                return <><Icon className={`h-5 w-5 ${typ.color}`} /><span className="text-foreground">{detailLog.title}</span></>;
              })()}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Detail lengkap insiden keamanan yang terdeteksi oleh sistem anti-cheat.
            </DialogDescription>
          </DialogHeader>

          {detailLog && (() => {
            const sev = getSeverityConfig(detailLog.severity);
            const typ = getTypeConfig(detailLog.type);
            const TypeIcon = typ.icon;
            return (
              <div className="space-y-4 pt-2">
                {/* Severity + Type header */}
                <div className="flex flex-wrap gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${sev.bg} ${sev.text} border ${sev.border}`}>
                    <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
                      {sev.ping && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sev.dot}`} />
                      )}
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${sev.dot}`} />
                    </span>
                    <span>{sev.label}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${typ.bg} ${typ.color} border ${typ.border}`}>
                    <TypeIcon className="h-3.5 w-3.5" />
                    {typ.label}
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground bg-muted/40 border border-border">
                    <Clock className="h-3.5 w-3.5" />
                    {formatWIBDateTime(detailLog.timestamp)}
                  </div>
                </div>

                {/* Incident description */}
                <div className="p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground font-mono leading-relaxed">{detailLog.details}</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-3">
                  {detailLog.ip && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">IP Address</span>
                      <p className="font-mono font-bold text-sm text-foreground">{detailLog.ip}</p>
                    </div>
                  )}
                  {detailLog.username && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Operative</span>
                      <p className="font-mono font-bold text-sm text-cyan-400">@{detailLog.username}</p>
                    </div>
                  )}
                  {detailLog.team_name && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Squad / Team</span>
                      <p className="font-mono font-bold text-sm text-foreground">{detailLog.team_name}</p>
                    </div>
                  )}
                  {detailLog.challenge_title && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Challenge</span>
                      <p className="font-mono font-bold text-sm text-primary">{detailLog.challenge_title}</p>
                    </div>
                  )}
                </div>

                {/* Raw metadata */}
                {detailLog.metadata && Object.keys(detailLog.metadata).length > 0 && (
                  <details className="cursor-pointer">
                    <summary className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors select-none">
                      📋 Raw Metadata / Evidence Data
                    </summary>
                    <pre className="mt-2 p-3 bg-muted/40 rounded-lg border border-border text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(detailLog.metadata, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Mitigation actions inside detail */}
                {(detailLog.team_id || detailLog.user_id) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <span className="text-[11px] font-mono text-muted-foreground self-center">Aksi Mitigasi Cepat:</span>
                    {detailLog.team_id && (
                      <Button variant="outline" size="sm" onClick={() => { setDetailLog(null); setActionDialog({ open: true, action: 'BAN_TEAM', log: detailLog, reason: `Anti-Cheat: ${detailLog.title}` }); }}
                        className="h-8 px-3 text-xs font-mono font-bold text-red-400 border-red-500/30 hover:bg-red-500/15 gap-1.5">
                        <Ban className="h-3.5 w-3.5" /> Ban Squad
                      </Button>
                    )}
                    {detailLog.user_id && (
                      <Button variant="outline" size="sm" onClick={() => { setDetailLog(null); setActionDialog({ open: true, action: 'FORCE_STOP_USER', log: detailLog, reason: `Suspicious: ${detailLog.title}` }); }}
                        className="h-8 px-3 text-xs font-mono text-amber-300 border-amber-500/30 hover:bg-amber-500/15 gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Force Stop User
                      </Button>
                    )}
                    {detailLog.user_id && (
                      <Button variant="outline" size="sm" onClick={() => { setDetailLog(null); setActionDialog({ open: true, action: 'REVOKE_USER_SESSION', log: detailLog, reason: `Session: ${detailLog.title}` }); }}
                        className="h-8 px-3 text-xs font-mono text-rose-300 border-rose-500/30 hover:bg-rose-500/15 gap-1.5">
                        <UserX className="h-3.5 w-3.5" /> Revoke Session
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => !open && setActionDialog({ open: false, action: null, log: null, reason: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 font-outfit uppercase text-base">
              <ShieldAlert className="h-5 w-5" />
              Konfirmasi Tindakan Anti-Cheat
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {actionDialog.action === 'BAN_TEAM' && <span>Apakah Anda yakin ingin <strong>BAN / DISKUALIFIKASI</strong> squad <strong className="text-foreground">{actionDialog.log?.team_name}</strong>?</span>}
              {actionDialog.action === 'FORCE_STOP_USER' && <span>Apakah Anda yakin ingin <strong>KUNCI SEMUA CHALLENGES</strong> milik <strong className="text-foreground">@{actionDialog.log?.username}</strong>?</span>}
              {actionDialog.action === 'REVOKE_USER_SESSION' && <span>Apakah Anda yakin ingin <strong>CABUT SESI LOGIN</strong> milik <strong className="text-foreground">@{actionDialog.log?.username}</strong>?</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs font-mono">
              <p className="text-muted-foreground">Trigger:</p>
              <p className="text-foreground font-bold mt-1">{actionDialog.log?.title}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">Alasan Audit:</label>
              <Input value={actionDialog.reason} onChange={e => setActionDialog(p => ({ ...p, reason: e.target.value }))} placeholder="Alasan tindakan..." className="h-8 text-xs font-mono" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setActionDialog({ open: false, action: null, log: null, reason: '' })} disabled={actionLoading} className="text-xs font-mono">Batal</Button>
            <Button variant="destructive" size="sm" onClick={handleTakeAction} disabled={actionLoading} className="text-xs font-mono font-bold">
              {actionLoading ? 'Mengeksekusi...' : 'Eksekusi Tindakan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Logs Dialog */}
      <Dialog open={clearDialog} onOpenChange={setClearDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-outfit uppercase text-base">
              <Trash2 className="h-5 w-5 text-red-400" />
              Bersihkan Log Keamanan?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              File <code className="text-primary font-mono">security.log</code> di server akan dikosongkan. Tindakan ini dicatat ke audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setClearDialog(false)} disabled={actionLoading}>Batal</Button>
            <Button variant="destructive" size="sm" onClick={handleClearLogs} disabled={actionLoading}>
              {actionLoading ? 'Membersihkan...' : 'Ya, Bersihkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAntiCheatLogs;
