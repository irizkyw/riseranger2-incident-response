import React, { useState, useEffect, useRef } from 'react';
import socketService from '@/services/socket';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  FileDown,
  FileCode,
  FileText,
  AlertCircle,
  Link2,
  Flame,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/services/api';

interface ChallengeCrudProps {
  challenges: any[];
  events: any[];
  categories: any[];
  onRefresh: () => void;
}

export const ChallengeCrud: React.FC<ChallengeCrudProps> = ({ challenges, events, categories, onRefresh }) => {
  // Local mutable challenge list — kept in sync with props and updated via realtime socket
  const [localChallenges, setLocalChallenges] = useState<any[]>(challenges);

  // Keep in sync whenever parent fetches fresh data
  useEffect(() => {
    setLocalChallenges(challenges);
  }, [challenges]);

  // Realtime: listen for challenge_visibility_update emitted by backend
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('join-admin-room');

      const handleVisibilityUpdate = (data: {
        type: 'single' | 'bulk';
        challenge_id?: string;
        event_id?: string | null;
        category?: string | null;
        is_hidden: boolean;
      }) => {
        setLocalChallenges(prev => prev.map(c => {
          if (data.type === 'single') {
            return c.id === data.challenge_id ? { ...c, is_hidden: data.is_hidden } : c;
          }
          // bulk: match event + category
          const matchEvent = !data.event_id || c.event_id === data.event_id;
          const matchCat = !data.category || c.category === data.category;
          return (matchEvent && matchCat) ? { ...c, is_hidden: data.is_hidden } : c;
        }));
      };

      socket.on('challenge_visibility_update', handleVisibilityUpdate);

      return () => {
        socket.off('challenge_visibility_update', handleVisibilityUpdate);
      };
    }
  }, []);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibleFlags, setVisibleFlags] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Import Spreadsheet & JSON state
  const [importTab, setImportTab] = useState<'spreadsheet' | 'json'>('spreadsheet');
  const [importData, setImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importDefaultEventId, setImportDefaultEventId] = useState(events.length > 0 ? events[0].id : '');
  const [importLoading, setImportLoading] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: categories.length > 0 ? categories[0].name : '',
    points: 100,
    flag: '',
    hint: '',
    hint_cost: 0,
    file_url: '',
    is_active: true,
    is_hidden: false,
    unlock_order: 1,
    event_id: events.length > 0 ? events[0].id : '',
    fb_bonus_override: false,
    fb_bonus_override_1st: 50,
    fb_bonus_override_2nd: 25,
    fb_bonus_override_3rd: 10
  });
  const [loading, setLoading] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState<{ id: string, title: string } | null>(null);

  const getCategoryBadge = (categoryName: string) => {
    const formatted = (categoryName || '').toUpperCase().replace(/_/g, ' ');
    return (
      <Badge variant="secondary" className="font-mono font-bold uppercase text-[10px] px-2 py-0.5 whitespace-nowrap">
        {formatted}
      </Badge>
    );
  };

  const toggleFlagVisibility = (id: string) => {
    setVisibleFlags(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      category: categories.length > 0 ? categories[0].name : '',
      points: 100,
      flag: '',
      hint: '',
      hint_cost: 0,
      file_url: '',
      is_active: true,
      is_hidden: false,
      unlock_order: 1,
      event_id: events.length > 0 ? events[0].id : '',
      fb_bonus_override: false,
      fb_bonus_override_1st: 50,
      fb_bonus_override_2nd: 25,
      fb_bonus_override_3rd: 10
    });
    setOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    const targetEvent = events.find((e: any) => e.id === c.event_id) || events[0];
    setFormData({
      title: c.title || '',
      description: c.description || '',
      category: c.category || '',
      points: c.points || 100,
      flag: c.flag || '',
      hint: c.hint || '',
      hint_cost: c.hint_cost || 0,
      file_url: c.file_url || '',
      is_active: c.is_active !== undefined ? c.is_active : true,
      is_hidden: c.is_hidden || false,
      unlock_order: c.unlock_order !== undefined ? c.unlock_order : 1,
      event_id: c.event_id || (events.length > 0 ? events[0].id : ''),
      fb_bonus_override: c.fb_bonus_override || false,
      fb_bonus_override_1st: c.fb_bonus_override_1st ?? (targetEvent?.fb_bonus_1st ?? 50),
      fb_bonus_override_2nd: c.fb_bonus_override_2nd ?? (targetEvent?.fb_bonus_2nd ?? 25),
      fb_bonus_override_3rd: c.fb_bonus_override_3rd ?? (targetEvent?.fb_bonus_3rd ?? 10)
    });
    setOpen(true);
  };

  const [confirmVisibilityModal, setConfirmVisibilityModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isHide: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const executeToggleSingleVisibility = async (c: any) => {
    const nextHidden = !c.is_hidden;
    // Optimistically update local state immediately so UI changes instantly
    setLocalChallenges(prev => prev.map(item => item.id === c.id ? { ...item, is_hidden: nextHidden } : item));
    try {
      const res = await api.put(`/admin/challenges/${c.id}/toggle-visibility`, {
        is_hidden: nextHidden
      });
      if (onRefresh) onRefresh();
      toast.success(res.data?.message || (nextHidden ? 'Challenge hidden from participants.' : 'Challenge is now visible to participants.'));
    } catch (err: any) {
      // Revert on failure
      setLocalChallenges(prev => prev.map(item => item.id === c.id ? { ...item, is_hidden: c.is_hidden } : item));
      toast.error(err.response?.data?.error || 'Failed to update challenge visibility');
    }
  };

  const handleToggleSingleVisibility = (c: any) => {
    const isCurrentlyHidden = Boolean(c.is_hidden);
    const willHide = !isCurrentlyHidden;

    setConfirmVisibilityModal({
      open: true,
      title: willHide ? 'Hide This Challenge?' : 'Show This Challenge?',
      description: willHide
        ? `Are you sure you want to HIDE "${c.title}" (${c.points} PTS)? Participants will no longer see or attempt this challenge in the arena.`
        : `Are you sure you want to SHOW "${c.title}" (${c.points} PTS)? This challenge will immediately become accessible to all participants in the arena.`,
      actionLabel: willHide ? 'Yes, Hide Challenge' : 'Yes, Show Challenge',
      isHide: willHide,
      onConfirm: async () => {
        await executeToggleSingleVisibility(c);
      }
    });
  };

  const executeBulkVisibility = async (is_hidden: boolean, targetCategory?: string) => {
    setBulkActionLoading(true);
    const payload: any = {
      is_hidden,
      event_id: eventFilter !== 'ALL' ? eventFilter : undefined
    };
    if (targetCategory && targetCategory !== 'ALL') {
      payload.category = targetCategory;
    }
    // Optimistically update local state immediately so UI changes instantly
    setLocalChallenges(prev => prev.map(item => {
      const matchEvent = !payload.event_id || item.event_id === payload.event_id;
      const matchCat = !payload.category || item.category === payload.category;
      return (matchEvent && matchCat) ? { ...item, is_hidden } : item;
    }));
    try {
      const res = await api.put('/admin/challenges/bulk-visibility', payload);
      if (onRefresh) onRefresh();
      toast.success(res.data?.message || 'Bulk challenge visibility updated!');
    } catch (err: any) {
      if (onRefresh) onRefresh();
      toast.error(err.response?.data?.error || 'Failed to update bulk visibility');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkVisibility = (is_hidden: boolean, scope: 'ALL' | 'CATEGORY', catName?: string) => {
    const targetCategory = catName || (scope === 'CATEGORY' ? categoryFilter : undefined);
    const scopeDesc = targetCategory && targetCategory !== 'ALL'
      ? `category "${targetCategory}"`
      : 'ALL CHALLENGES';
    const eventDesc = eventFilter !== 'ALL'
      ? `in arena "${events.find(e => e.id === eventFilter)?.name || eventFilter}"`
      : 'across all arenas';

    setConfirmVisibilityModal({
      open: true,
      title: is_hidden ? `Hide ${scopeDesc}?` : `Show ${scopeDesc}?`,
      description: is_hidden
        ? `Are you sure you want to HIDE ${scopeDesc} ${eventDesc}? All these challenges will be removed from participants' dashboards.`
        : `Are you sure you want to SHOW ${scopeDesc} ${eventDesc}? All these challenges will immediately become accessible to all participants.`,
      actionLabel: is_hidden ? 'Yes, Hide All' : 'Yes, Show All',
      isHide: is_hidden,
      onConfirm: async () => {
        await executeBulkVisibility(is_hidden, targetCategory);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.flag || formData.flag.trim() === '') {
      toast.error('Flag is required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        flag: formData.flag.trim(),
        points: Number(formData.points),
        hint_cost: Number(formData.hint_cost),
        is_hidden: Boolean(formData.is_hidden),
        unlock_order: Number(formData.unlock_order) || 1,
        fb_bonus_override: Boolean(formData.fb_bonus_override),
        fb_bonus_override_1st: Number(formData.fb_bonus_override_1st) || 50,
        fb_bonus_override_2nd: Number(formData.fb_bonus_override_2nd) || 25,
        fb_bonus_override_3rd: Number(formData.fb_bonus_override_3rd) || 10
      };
      if (editingId) {
        await api.put(`/admin/challenges/${editingId}`, payload);
        toast.success('Challenge updated successfully');
      } else {
        await api.post('/admin/challenges', payload);
        toast.success('Challenge created successfully');
      }
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/challenges/${id}`);
      toast.success('Challenge deleted successfully');
      setDeleteChallenge(null);
      onRefresh();
    } catch (err) {
      toast.error('Failed to delete challenge');
    }
  };

  const handleDownloadChallengeTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const defaultEvName = events[0]?.name || 'CTF National Championship 2026';
    const sampleRows = [
      {
        title: 'Buffer Overflow 101',
        category: 'PWN',
        points: 250,
        unlock_order: 1,
        flag: 'CTF{b0f_st4ck_sm4sh_succ3ss_2026}',
        description: 'Analyze the binary and overflow the stack buffer to hijack instruction pointer.',
        hint: 'Check the gets() function vulnerability without bounds checking.',
        hint_cost: 25,
        file_url: 'https://cdn.example.com/chals/bof101.zip',
        event_name: defaultEvName,
        is_active: 'TRUE'
      },
      {
        title: 'SQLi Authentication Bypass',
        category: 'WEB EXPLOITATION',
        points: 150,
        unlock_order: 2,
        flag: 'CTF{sql1_4uth_byp4ss_m4st3r_992}',
        description: 'Bypass the login portal using SQL Injection vulnerability.',
        hint: "Try payload: admin' -- or ' OR '1'='1",
        hint_cost: 15,
        file_url: 'http://chall.ctf.local:8080',
        event_name: defaultEvName,
        is_active: 'TRUE'
      },
      {
        title: 'Memory Dump Artifact Extraction',
        category: 'INCIDENT RESPONSE',
        points: 300,
        unlock_order: 3,
        flag: 'CTF{m3m_dump_m4lw4r3_tr4c3_f0und}',
        description: 'Inspect the captured memory image (.raw) and recover the suspicious process PID.',
        hint: 'Use Volatility 3 with windows.pslist and windows.malfind plugins.',
        hint_cost: 30,
        file_url: 'https://cdn.example.com/evidence/memdump.raw',
        event_name: defaultEvName,
        is_active: 'TRUE'
      },
      {
        title: 'Hidden Steganography In PNG',
        category: 'FORENSICS',
        points: 100,
        unlock_order: 1,
        flag: 'CTF{st3g0_lsb_s3cr3t_m3ss4g3_2026}',
        description: 'A secret message has been embedded into the least significant bits of the image.',
        hint: 'Use zsteg or stegsolve to extract LSB planes.',
        hint_cost: 10,
        file_url: 'https://cdn.example.com/chals/secret.png',
        event_name: defaultEvName,
        is_active: 'TRUE'
      },
      {
        title: 'Custom XOR Cipher Cracking',
        category: 'CRYPTOGRAPHY',
        points: 200,
        unlock_order: 2,
        flag: 'CTF{x0r_k3y_r3p34t_br0k3n_c1ph3r}',
        description: 'Decrypt the ciphertext encrypted with repeating-key XOR.',
        hint: 'Calculate Hamming distance and index of coincidence to find key length.',
        hint_cost: 20,
        file_url: '',
        event_name: defaultEvName,
        is_active: 'TRUE'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Challenges');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'Template_Import_Challenges.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Challenges.xlsx');
    }
    toast.success(`${format.toUpperCase()} template downloaded successfully.`);
  };

  const handleChallengeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('The spreadsheet file is empty or could not be read.');
          return;
        }

        setImportData(data);
        toast.success(`Successfully read ${data.length} challenge rows from file.`);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        toast.error('Failed to read spreadsheet file. Please ensure a valid .xlsx or .csv format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessChallengeImport = async () => {
    if (importTab === 'spreadsheet') {
      if (importData.length === 0) {
        toast.error('No challenge data to import.');
        return;
      }

      setImportLoading(true);
      try {
        const res = await api.post('/admin/challenges/import', {
          challenges: importData,
          default_event_id: importDefaultEventId || events[0]?.id
        });

        toast.success(res.data.message || 'Challenges imported successfully!');
        if (res.data.warnings && res.data.warnings.length > 0) {
          console.warn('Import warnings:', res.data.warnings);
          toast.warning(`${res.data.warnings.length} baris dilewati (cek konsol/format)`);
        }
        setImportOpen(false);
        setImportData([]);
        setImportFileName('');
        onRefresh();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to process challenge import.');
      } finally {
        setImportLoading(false);
      }
    } else {
      // JSON Mode
      try {
        const parsed = JSON.parse(importJson);
        if (!Array.isArray(parsed)) {
          toast.error('JSON must be an array of challenges');
          return;
        }
        setImportLoading(true);
        const res = await api.post('/admin/challenges/import', {
          challenges: parsed,
          default_event_id: importDefaultEventId || events[0]?.id
        });
        toast.success(res.data.message || 'Challenges imported successfully');
        setImportOpen(false);
        setImportJson('');
        onRefresh();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Invalid JSON format or server error');
      } finally {
        setImportLoading(false);
      }
    }
  };

  const handleExportXLSX = () => {
    if (filteredChallenges.length === 0) {
      toast.error('No challenges to export');
      return;
    }

    const rows = filteredChallenges.map(c => ({
      Title: c.title,
      Category: c.category,
      Points: c.points,
      Flag: c.flag,
      Status: c.is_active ? 'ACTIVE' : 'INACTIVE',
      Event: c.event?.name || '',
      Hint: c.hint || '',
      HintCost: c.hint_cost || 0,
      FileURL: c.file_url || '',
      Description: c.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Challenges');
    XLSX.writeFile(workbook, `ctf_challenges_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Challenges exported to XLSX!');
  };

  const handleExportCSV = () => {
    if (filteredChallenges.length === 0) {
      toast.error('No challenges to export');
      return;
    }

    const headers = ['Title', 'Category', 'Points', 'Flag', 'Status', 'Event', 'Hint Cost', 'File URL', 'Description'];
    const rows = filteredChallenges.map(c => [
      c.title,
      c.category,
      c.points,
      c.flag || '',
      c.is_active ? 'ACTIVE' : 'INACTIVE',
      c.event?.name || '',
      c.hint_cost || 0,
      c.file_url || '',
      (c.description || '').replace(/\n/g, ' ')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_challenges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Challenges exported to CSV!');
  };

  // Filter computation — uses localChallenges so socket updates reflect without refresh
  const filteredChallenges = localChallenges.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchesEvent = eventFilter === 'ALL' || c.event_id === eventFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && c.is_active) ||
      (statusFilter === 'INACTIVE' && !c.is_active);
    const matchesVisibility =
      visibilityFilter === 'ALL' ||
      (visibilityFilter === 'VISIBLE' && !c.is_hidden) ||
      (visibilityFilter === 'HIDDEN' && c.is_hidden);

    return matchesSearch && matchesCategory && matchesEvent && matchesStatus && matchesVisibility;
  });

  const totalPages = Math.ceil(filteredChallenges.length / pageSize) || 1;
  const paginatedChallenges = filteredChallenges.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation — based on localChallenges for instant reactivity
  const totalCount = localChallenges.length;
  const visibleCount = localChallenges.filter(c => !c.is_hidden && c.is_active).length;
  const hiddenCount = localChallenges.filter(c => c.is_hidden).length;
  const totalPoints = localChallenges.reduce((acc, c) => acc + (c.points || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Challenges</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Visible to Users</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{visibleCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Eye className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Hidden from Users</p>
              <h3 className="text-3xl font-black font-mono text-amber-400 mt-1">{hiddenCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <EyeOff className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-cyan-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">Points Pool</p>
              <h3 className="text-3xl font-black font-mono text-cyan-400 mt-1">{totalPoints}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Visibility Action Toolbar */}
      <div className="bg-muted/30 border border-border rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5 mr-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Quick Visibility Controls:
          </span>

          {/* Show / Hide All */}
          <Button
            variant="outline"
            size="sm"
            disabled={bulkActionLoading}
            onClick={() => handleBulkVisibility(false, 'ALL')}
            className="h-8 text-xs font-mono font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15 gap-1"
            title="Show all challenges to participants"
          >
            <Eye className="h-3.5 w-3.5" />
            Show All ({eventFilter === 'ALL' ? 'All Arenas' : 'Selected Arena'})
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={bulkActionLoading}
            onClick={() => handleBulkVisibility(true, 'ALL')}
            className="h-8 text-xs font-mono font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/15 gap-1"
            title="Hide all challenges from participants"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hide All ({eventFilter === 'ALL' ? 'All Arenas' : 'Selected Arena'})
          </Button>

          {/* Category specific quick bulk toggle */}
          {categoryFilter !== 'ALL' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/40 bg-primary/10 text-primary">
                Kategori: {categoryFilter}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkActionLoading}
                onClick={() => handleBulkVisibility(false, 'CATEGORY', categoryFilter)}
                className="h-8 text-xs font-mono text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15 gap-1"
                title={`Show all challenges in category ${categoryFilter} to participants`}
              >
                <Eye className="h-3.5 w-3.5" />
                Show Category
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkActionLoading}
                onClick={() => handleBulkVisibility(true, 'CATEGORY', categoryFilter)}
                className="h-8 text-xs font-mono text-amber-400 border-amber-500/30 hover:bg-amber-500/15 gap-1"
                title={`Hide all challenges in category ${categoryFilter} from participants`}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide Category
              </Button>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
          <span>Showing <strong>{filteredChallenges.length}</strong> of <strong>{totalCount}</strong> challenges</span>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs font-mono">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="font-mono text-xs">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id || cat.name} value={cat.name} className="font-mono text-xs">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Event Filter */}
          <Select
            value={eventFilter}
            onValueChange={(val) => { setEventFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="h-9 w-[180px] text-xs font-mono">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="font-mono text-xs">All Events</SelectItem>
              {events.map((ev) => (
                <SelectItem key={ev.id} value={ev.id} className="font-mono text-xs">{ev.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Visibility Filter */}
          <div className="flex items-center rounded-md border border-input bg-background p-0.5 text-xs font-mono">
            <button
              onClick={() => { setVisibilityFilter('ALL'); setCurrentPage(1); }}
              className={`px-2 py-1 rounded font-medium transition-colors ${visibilityFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All Visibility
            </button>
            <button
              onClick={() => { setVisibilityFilter('VISIBLE'); setCurrentPage(1); }}
              className={`px-2 py-1 rounded font-medium transition-colors ${visibilityFilter === 'VISIBLE' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Visible ({visibleCount})
            </button>
            <button
              onClick={() => { setVisibilityFilter('HIDDEN'); setCurrentPage(1); }}
              className={`px-2 py-1 rounded font-medium transition-colors ${visibilityFilter === 'HIDDEN' ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Hidden ({hiddenCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportXLSX} className="h-9 text-xs gap-1.5" title="Export to Excel XLSX">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
            <Download className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-9 text-xs gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-bold" title="Import via Spreadsheet (XLSX / CSV) or JSON">
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="h-9 text-xs gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      {/* Challenges Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase w-20">Status</TableHead>
                <TableHead className="text-xs uppercase w-28">Visibility</TableHead>
                <TableHead className="text-xs uppercase">Challenge Title</TableHead>
                <TableHead className="text-xs uppercase w-40">Category</TableHead>
                <TableHead className="text-xs uppercase w-36">Arena Event</TableHead>
                <TableHead className="text-xs uppercase text-right w-24">Points</TableHead>
                <TableHead className="text-xs uppercase text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedChallenges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Shield className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No challenges found matching your filters. Click "Create" to author one.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedChallenges.map((c) => {
                  return (
                    <TableRow key={c.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 whitespace-nowrap ${c.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-muted/30 text-muted-foreground border-border'
                            }`}
                        >
                          {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </TableCell>

                      {/* Visibility Toggle Badge */}
                      <TableCell>
                        <button
                          onClick={() => handleToggleSingleVisibility(c)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all border cursor-pointer ${c.is_hidden
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                            }`}
                          title={c.is_hidden ? " Challenge is hidden. Click to SHOW to participants." : " Challenge is visible. Click to HIDE from participants."}
                        >
                          {c.is_hidden ? (
                            <>
                              <EyeOff className="h-3 w-3 text-amber-400 shrink-0" />
                              <span>HIDDEN</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span>VISIBLE</span>
                            </>
                          )}
                        </button>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{c.title}</span>
                          {(c.event?.is_chained || c.unlock_order > 0) && (
                            <Badge variant="outline" className="font-mono gap-1 shrink-0 text-[10px] font-bold border-border bg-muted/20 px-1.5 py-0.5">
                              <Link2 className="h-2.5 w-2.5" /> Step #{c.unlock_order || 1}
                            </Badge>
                          )}
                          {c.fb_bonus_override && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono whitespace-nowrap bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold px-1.5 py-0.5"
                              title="Custom FB Override Aktif"
                            >
                              🔥 FB Custom
                            </Badge>
                          )}
                        </div>
                        {c.hint && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <HelpCircle className="h-3 w-3 text-amber-400" />
                            <span>Hint cost: {c.hint_cost} pts</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {getCategoryBadge(c.category)}
                      </TableCell>

                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-muted-foreground font-mono">{c.event?.name || 'All Arenas'}</span>
                          {c.event?.is_chained && (
                            <Badge variant="outline" className="font-mono uppercase text-[10px] px-1.5 py-0.5 bg-muted/20 border-border">
                              CHAINED
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-primary text-sm whitespace-nowrap">
                        {c.points} PTS
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleSingleVisibility(c)}
                            className={`h-7 w-7 ${c.is_hidden ? 'text-amber-400 hover:bg-amber-500/15' : 'text-emerald-400 hover:bg-emerald-500/15'}`}
                            title={c.is_hidden ? "Show this challenge to participants" : "Hide this challenge from participants"}
                          >
                            {c.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(c)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Edit Challenge"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteChallenge({ id: c.id, title: c.title })}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete Challenge"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredChallenges.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* CREATE / EDIT CHALLENGE MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {editingId ? 'Edit Challenge' : 'Create New Challenge'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Update parameters, descriptions, points, and flag key.' : 'Author and deploy a new challenge to the competition arena.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Memory Leak 101"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id || cat.name} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Arena Event</label>
                <Select
                  value={formData.event_id}
                  onValueChange={(val) => setFormData({ ...formData, event_id: val })}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select Arena Event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name} {ev.is_chained ? '⚡ (Chaining)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chaining Step Sequence Order Input */}
            {(() => {
              const selEv = events.find(ev => ev.id === formData.event_id);
              const isChained = selEv?.is_chained ?? false;
              return (
                <div className={`p-3.5 rounded-lg border transition-all ${isChained
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                  : 'bg-muted/30 border-border'
                  } space-y-2`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase flex items-center gap-1.5 text-foreground">
                      <Link2 className={`h-4 w-4 ${isChained ? 'text-amber-400' : 'text-primary'}`} />
                      <span>Chaining Step Sequence</span>
                    </label>
                    {isChained ? (
                      <Badge variant="outline" className="uppercase font-mono tracking-wider font-bold">
                        ⚡ CHAINED EVENT ARENA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        OPEN ARENA
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isChained ? (
                      <>In Chaining events, challenges unlock sequentially (<strong>Step 1</strong> &rarr; <strong>Step 2</strong> &rarr; <strong>Step 3</strong>) per category. Operatives must solve the previous step to unlock the next.</>
                    ) : (
                      <>Challenge display order sequence in the competition arena (1 = top / earliest).</>
                    )}
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Step Number:</span>
                      <Input
                        type="number"
                        min={1}
                        value={formData.unlock_order}
                        onChange={(e) => setFormData({ ...formData, unlock_order: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-24 h-9 font-mono font-bold text-center border-amber-500/50 bg-background text-amber-400"
                        required
                      />
                    </div>
                    <div className="text-xs font-mono">
                      {formData.unlock_order <= 1 ? (
                        <span className="text-emerald-400 font-semibold">🔓 Step #1: Initial Challenge (Unlocked by Default)</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">🔒 Step #{formData.unlock_order}: Unlocks after Step #{formData.unlock_order - 1} is solved</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description (Markdown format supported)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide scenario, instructions, clues, and connection info..."
                className="w-full h-24 p-3 rounded-md bg-background border border-input text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Points Reward</label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Flag String</label>
                <Input
                  value={formData.flag}
                  onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                  placeholder="CTF{secret_flag_value}"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Downloadable Asset URL / File Path (Optional)</label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://storage.ctf.example/files/dump.pcap"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Hint (Optional)</label>
                <Input
                  value={formData.hint}
                  onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                  placeholder="Check the packet stream index 4"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Hint Cost (Penalty)</label>
                <Input
                  type="number"
                  value={formData.hint_cost}
                  onChange={(e) => setFormData({ ...formData, hint_cost: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* First Blood Bonus Override Section */}
            <div className="border border-amber-500/30 rounded-xl bg-amber-500/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-foreground">Custom First Blood Bonus (Override)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formData.fb_bonus_override ? 'Override ACTIVE' : 'Use Event Configuration'}
                  </span>
                  <div
                    onClick={() => {
                      const targetEvent = events.find((e: any) => e.id === formData.event_id) || events[0];
                      setFormData({
                        ...formData,
                        fb_bonus_override: !formData.fb_bonus_override,
                        fb_bonus_override_1st: formData.fb_bonus_override_1st || targetEvent?.fb_bonus_1st || 50,
                        fb_bonus_override_2nd: formData.fb_bonus_override_2nd || targetEvent?.fb_bonus_2nd || 25,
                        fb_bonus_override_3rd: formData.fb_bonus_override_3rd || targetEvent?.fb_bonus_3rd || 10
                      });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.fb_bonus_override ? 'bg-amber-500' : 'bg-muted'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${formData.fb_bonus_override ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </div>
                </label>
              </div>

              {!formData.fb_bonus_override && (
                <div className="px-4 py-2.5 text-xs text-muted-foreground bg-muted/20 flex flex-wrap items-center justify-between gap-1">
                  <span>Skema Event ({events.find((e: any) => e.id === formData.event_id)?.name || 'Default'}):</span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    1st: <span className="text-amber-400">+{events.find((e: any) => e.id === formData.event_id)?.fb_bonus_1st ?? 50}</span> | 2nd: <span className="text-slate-300">+{events.find((e: any) => e.id === formData.event_id)?.fb_bonus_2nd ?? 25}</span> | 3rd: <span className="text-amber-600">+{events.find((e: any) => e.id === formData.event_id)?.fb_bonus_3rd ?? 10}</span>
                  </span>
                </div>
              )}

              {formData.fb_bonus_override && (
                <div className="px-4 py-3 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The bonus values below will override the event-level First Blood bonus configuration for this specific challenge.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-extrabold text-amber-400 flex items-center gap-1">
                        👑 1st Blood (+PTS)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.fb_bonus_override_1st}
                        onChange={(e) => setFormData({ ...formData, fb_bonus_override_1st: parseInt(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-md bg-background border border-amber-500/30 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1">
                        🥈 2nd Blood (+PTS)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.fb_bonus_override_2nd}
                        onChange={(e) => setFormData({ ...formData, fb_bonus_override_2nd: parseInt(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-md bg-background border border-slate-500/30 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-amber-600 flex items-center gap-1">
                        🥉 3rd Blood (+PTS)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.fb_bonus_override_3rd}
                        onChange={(e) => setFormData({ ...formData, fb_bonus_override_3rd: parseInt(e.target.value) || 0 })}
                        className="w-full h-8 px-2 rounded-md bg-background border border-amber-600/30 text-xs font-mono font-bold text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1">
                    Preview: 1st solver mendapat <strong className="text-amber-400">{(formData.points || 100) + (formData.fb_bonus_override_1st || 0)} PTS</strong> · 2nd solver: <strong className="text-slate-300">{(formData.points || 100) + (formData.fb_bonus_override_2nd || 0)} PTS</strong> · 3rd solver: <strong className="text-amber-600">{(formData.points || 100) + (formData.fb_bonus_override_3rd || 0)} PTS</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg">
              <label className="flex items-center gap-2 text-xs font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-foreground">⚡ Challenge Active</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-mono font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_hidden}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="rounded border-amber-500 text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <span className={formData.is_hidden ? 'text-amber-400 font-bold' : 'text-muted-foreground'}>
                  Hide from Participants (Hidden)
                </span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Challenge')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* IMPORT CHALLENGES VIA SPREADSHEET (XLSX/CSV) & JSON MODAL */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit text-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import CTF Challenges (XLSX / CSV / JSON)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a spreadsheet (.xlsx / .csv) or paste a JSON array to batch import CTF challenges instantly.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importTab} onValueChange={(v: any) => setImportTab(v)} className="w-full mt-2">
            <TabsList className="grid grid-cols-2 w-full max-w-sm mb-4">
              <TabsTrigger value="spreadsheet" className="text-xs gap-1.5 font-bold">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                Spreadsheet (.XLSX / .CSV)
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs gap-1.5 font-bold">
                <FileCode className="h-3.5 w-3.5 text-primary" />
                Raw JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spreadsheet" className="space-y-4">
              {/* Template Download Section */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileDown className="h-4 w-4 text-emerald-400" />
                    Download Official Template Format
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Columns: <code>title, category, points, unlock_order, flag, description, hint, hint_cost, file_url, event_name, is_active</code>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadChallengeTemplate('xlsx')}
                    className="gap-1.5 text-xs h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Template .XLSX
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadChallengeTemplate('csv')}
                    className="gap-1.5 text-xs h-8"
                  >
                    <FileDown className="h-3.5 w-3.5 text-primary" />
                    Template .CSV
                  </Button>
                </div>
              </div>

              {/* Chaining Guidance Banner */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 shrink-0" />
                  <span>Chaining Sequence Guide (`unlock_order`):</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  In <strong>Chaining</strong> events, challenges unlock sequentially based on the <code>unlock_order</code> column (Step 1, Step 2, Step 3...). Leaving this empty automatically assigns steps following row order.
                </p>
              </div>

              {/* Default Event Fallback */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Default Target Arena Event</label>
                <Select
                  value={importDefaultEventId}
                  onValueChange={(val) => setImportDefaultEventId(val)}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select Default Event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Applied automatically if a challenge row does not specify an event or if the event is not found.
                </p>
              </div>

              {/* File Upload Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Choose Spreadsheet File</label>
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-6 text-center bg-card">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-medium text-foreground mb-1">
                    {importFileName ? (
                      <span className="text-primary font-bold">{importFileName}</span>
                    ) : (
                      'Click to browse .xlsx / .xls / .csv file'
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-3">Supports hundreds of challenges simultaneously in seconds.</p>
                  <Input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleChallengeFileChange}
                    className="max-w-xs mx-auto h-9 text-xs cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Data Preview */}
              {importData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-foreground">
                      Data Preview ({importData.length} challenges found)
                    </h4>
                    <Badge variant="outline">
                      Ready to Import
                    </Badge>
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs bg-card">
                    {importData.slice(0, 50).map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-muted/20 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground truncate">{row.title || row.Title || row.name || 'Untitled Challenge'}</span>
                            <Badge variant="secondary" className="uppercase font-mono px-1 py-0 shrink-0">
                              {row.category || row.Category || 'MISC'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                            Flag: <span className="text-primary">{row.flag || row.Flag || '(Required)'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono font-bold text-primary">
                            {row.points || row.Points || 100} PTS
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {row.event_name || row.event || 'Default Event'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {importData.length > 50 && (
                      <div className="p-2 text-center text-muted-foreground text-[10px]">
                        ... and {importData.length - 50} more challenge rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste JSON array of challenge objects below:
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={'[\n  {\n    "title": "Buffer Overflow 101",\n    "category": "PWN",\n    "points": 250,\n    "flag": "CTF{flag_secret}",\n    "description": "Exploit binary...",\n    "hint": "Check gets()",\n    "hint_cost": 25\n  }\n]'}
                className="w-full h-48 p-3 rounded-md bg-background border border-input font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              disabled={importLoading || (importTab === 'spreadsheet' ? importData.length === 0 : !importJson.trim())}
              onClick={handleProcessChallengeImport}
              className="gap-1.5 font-bold"
            >
              {importLoading ? 'Importing Challenges...' : `Import ${importTab === 'spreadsheet' ? `${importData.length} Challenges` : 'via JSON'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CHALLENGE CONFIRMATION MODAL */}
      <Dialog open={!!deleteChallenge} onOpenChange={(open) => !open && setDeleteChallenge(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 font-outfit">
              <Trash2 className="h-5 w-5" />
              Delete Challenge
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteChallenge?.title}"</strong>? All associated submissions and first bloods will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChallenge(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteChallenge && handleDelete(deleteChallenge.id)}>
              Delete Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHALLENGE VISIBILITY CONFIRMATION MODAL */}
      <Dialog open={Boolean(confirmVisibilityModal?.open)} onOpenChange={(open) => !open && setConfirmVisibilityModal(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={confirmVisibilityModal?.isHide ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono text-xs' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs'}>
                {confirmVisibilityModal?.isHide ? '🙈 HIDE CHALLENGE' : '👁️ SHOW CHALLENGE'}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold font-outfit uppercase tracking-wider text-foreground">
              {confirmVisibilityModal?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {confirmVisibilityModal?.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmVisibilityModal(null)}
              className="border-border hover:bg-muted text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              className={confirmVisibilityModal?.isHide
                ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
              }
              onClick={async () => {
                if (confirmVisibilityModal?.onConfirm) {
                  await confirmVisibilityModal.onConfirm();
                }
                setConfirmVisibilityModal(null);
              }}
            >
              {confirmVisibilityModal?.actionLabel || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
