import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibleFlags, setVisibleFlags] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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
    event_id: events.length > 0 ? events[0].id : '',
  });
  const [loading, setLoading] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState<{ id: string, title: string } | null>(null);

  const getCategoryBadge = (categoryName: string) => {
    const norm = (categoryName || '').toUpperCase();
    let colorClass = 'bg-primary/10 text-primary border-primary/30';
    if (norm.includes('INCIDENT') || norm.includes('PWN')) colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    else if (norm.includes('FORENSIC')) colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    else if (norm.includes('WEB')) colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    else if (norm.includes('NETWORK')) colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    else if (norm.includes('CRYPTO')) colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

    const formatted = norm.replace(/_/g, ' ');
    return (
      <Badge variant="outline" className={`font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 uppercase ${colorClass}`}>
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
      event_id: events.length > 0 ? events[0].id : '',
    });
    setOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
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
      event_id: c.event_id || (events.length > 0 ? events[0].id : ''),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.flag || formData.flag.trim() === '') {
      toast.error('Flag is required');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const payload: any = {
          ...formData,
          flag: formData.flag.trim(),
          points: Number(formData.points),
          hint_cost: Number(formData.hint_cost)
        };
        await api.put(`/admin/challenges/${editingId}`, payload);
        toast.success('Challenge updated successfully');
      } else {
        await api.post('/admin/challenges', {
          ...formData,
          flag: formData.flag.trim(),
          points: Number(formData.points),
          hint_cost: Number(formData.hint_cost),
          event_id: formData.event_id
        });
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
    toast.success(`Template ${format.toUpperCase()} berhasil diunduh.`);
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
          toast.error('File spreadsheet kosong atau tidak terbaca.');
          return;
        }

        setImportData(data);
        toast.success(`Berhasil membaca ${data.length} baris tantangan dari file.`);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        toast.error('Gagal membaca file spreadsheet. Pastikan format .xlsx atau .csv valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessChallengeImport = async () => {
    if (importTab === 'spreadsheet') {
      if (importData.length === 0) {
        toast.error('Tidak ada data tantangan yang akan diimpor.');
        return;
      }

      setImportLoading(true);
      try {
        const res = await api.post('/admin/challenges/import', {
          challenges: importData,
          default_event_id: importDefaultEventId || events[0]?.id
        });

        toast.success(res.data.message || 'Import tantangan berhasil!');
        if (res.data.warnings && res.data.warnings.length > 0) {
          console.warn('Import warnings:', res.data.warnings);
          toast.warning(`${res.data.warnings.length} baris dilewati (cek konsol/format)`);
        }
        setImportOpen(false);
        setImportData([]);
        setImportFileName('');
        onRefresh();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Gagal memproses import tantangan.');
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

  // Filter computation
  const filteredChallenges = challenges.filter(c => {
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

    return matchesSearch && matchesCategory && matchesEvent && matchesStatus;
  });

  const totalPages = Math.ceil(filteredChallenges.length / pageSize) || 1;
  const paginatedChallenges = filteredChallenges.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalCount = challenges.length;
  const activeCount = challenges.filter(c => c.is_active).length;
  const inactiveCount = challenges.filter(c => !c.is_active).length;
  const totalPoints = challenges.reduce((acc, c) => acc + (c.points || 0), 0);

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
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Active Challenges</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-rose-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-400 tracking-wider">Drafts / Inactive</p>
              <h3 className="text-3xl font-black font-mono text-rose-400 mt-1">{inactiveCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Points Pool</p>
              <h3 className="text-3xl font-black font-mono text-amber-400 mt-1">{totalPoints}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select 
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          {/* Event Filter */}
          <select 
            value={eventFilter}
            onChange={(e) => { setEventFilter(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-md border border-input bg-background p-0.5 text-xs">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter('INACTIVE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Inactive
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
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase">Challenge Title</TableHead>
                <TableHead className="text-xs uppercase">Category</TableHead>
                <TableHead className="text-xs uppercase">Arena Event</TableHead>
                <TableHead className="text-xs uppercase text-right">Points</TableHead>
                <TableHead className="text-xs uppercase">CTF Flag Key</TableHead>
                <TableHead className="text-xs uppercase text-right">Actions</TableHead>
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
                  const isFlagVisible = visibleFlags[c.id];
                  return (
                    <TableRow key={c.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        {c.is_active ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-semibold">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] uppercase font-semibold">
                            INACTIVE
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-sm text-foreground">{c.title}</div>
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

                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {c.event?.name || 'All Arenas'}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-primary text-sm">
                        {c.points} PTS
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-muted/60 font-mono text-xs text-muted-foreground tracking-wider select-all">
                            {isFlagVisible ? (c.flag || 'CTF{...}') : '••••••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleFlagVisibility(c.id)}
                            title={isFlagVisible ? "Hide Flag" : "Show Flag"}
                          >
                            {isFlagVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Arena Event</label>
                <select 
                  value={formData.event_id} 
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            </div>

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

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Challenge Active (Visible to Participants)</span>
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
              Unggah file spreadsheet (.xlsx / .csv) atau tempel JSON array untuk menambahkan banyak soal CTF sekaligus secara instan.
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
                    Unduh Format Template Resmi
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Kolom: <code>title, category, points, flag, description, hint, hint_cost, file_url, event_name, is_active</code>
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

              {/* Default Event Fallback */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Default Target Arena Event</label>
                <select
                  value={importDefaultEventId}
                  onChange={(e) => setImportDefaultEventId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Digunakan otomatis jika baris soal pada spreadsheet tidak mencantumkan nama event atau event tidak ditemukan.
                </p>
              </div>

              {/* File Upload Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Pilih File Spreadsheet</label>
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-6 text-center bg-card">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-medium text-foreground mb-1">
                    {importFileName ? (
                      <span className="text-primary font-bold">{importFileName}</span>
                    ) : (
                      'Klik untuk memilih file .xlsx / .xls / .csv'
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-3">Mendukung ratusan soal sekaligus dalam hitungan detik.</p>
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
                      Preview Data ({importData.length} soal tantangan ditemukan)
                    </h4>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Siap Diimpor
                    </Badge>
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs bg-card">
                    {importData.slice(0, 50).map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-muted/20 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground truncate">{row.title || row.Title || row.name || 'Tanpa Judul'}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1 py-0 shrink-0">
                              {row.category || row.Category || 'MISC'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                            Flag: <span className="text-primary">{row.flag || row.Flag || '(Wajib diisi)'}</span>
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
                        ... dan {importData.length - 50} baris tantangan lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Tempel JSON array dari daftar soal tantangan di bawah ini:
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
            <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
            <Button 
              disabled={importLoading || (importTab === 'spreadsheet' ? importData.length === 0 : !importJson.trim())} 
              onClick={handleProcessChallengeImport}
              className="gap-1.5 font-bold"
            >
              {importLoading ? 'Memproses Import...' : `Impor ${importTab === 'spreadsheet' ? `${importData.length} Tantangan` : 'via JSON'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CHALLENGE CONFIRMATION MODAL */}
      <Dialog open={!!deleteChallenge} onOpenChange={(open) => !open && setDeleteChallenge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
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
    </div>
  );
};
