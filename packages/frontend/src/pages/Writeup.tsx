import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileArchive,
  FileCheck,
  Trash2,
  RefreshCw,
  Award,
  MessageSquare,
  Calendar,
  Sparkles,
  Info,
  Users,
  Key,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/services/api';

export const Writeup: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [requireTeam, setRequireTeam] = useState(false);
  const [requireToken, setRequireToken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWriteupStatus = async () => {
    setLoading(true);
    setRequireTeam(false);
    setRequireToken(false);
    try {
      const res = await api.get('/writeup');
      setData(res.data);
      if (res.data.writeup?.notes) {
        setNotes(res.data.writeup.notes);
      }
    } catch (err: any) {
      setData(null);
      if (err.response?.data?.require_team) {
        setRequireTeam(true);
        toast.error('Anda harus memiliki Tim / Squad untuk mengakses menu Writeup.');
      } else if (err.response?.data?.require_token) {
        setRequireToken(true);
        toast.error('Anda belum terdaftar dalam event. Silakan masukkan Access Token.');
      } else {
        toast.error(err.response?.data?.error || 'Gagal memuat status writeup.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWriteupStatus();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowed = ['.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.docx', '.doc', '.md', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      toast.error('Format file tidak didukung! Gunakan .pdf, .zip, .rar, .docx, atau .md');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar! Maksimal 50MB.');
      return;
    }

    setSelectedFile(file);
    toast.success(`File "${file.name}" siap diunggah.`);
  };

  const handleSubmitWriteup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireTeam) {
      toast.error('Anda harus bergabung ke dalam Tim / Squad terlebih dahulu.');
      return;
    }
    if (requireToken) {
      toast.error('Anda harus memasukkan Access Token terlebih dahulu.');
      return;
    }
    if (!selectedFile) {
      toast.error('Pilih file writeup terlebih dahulu.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const res = await api.post('/writeup/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data.message || 'Writeup berhasil dikirim!');
      setSelectedFile(null);
      fetchWriteupStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah file writeup.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!data?.writeup?.id) return;
    try {
      const res = await api.get(`/writeup/download/${data.writeup.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.writeup.file_name || 'writeup_submission.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download dimulai...');
    } catch (err) {
      toast.error('Gagal mengunduh file writeup.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const event = data?.event;
  const writeup = data?.writeup;
  const isEvaluated = writeup && writeup.evaluated_at;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Report & Writeup
              {writeup && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                  ✓ SUBMITTED
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kirim laporan investigasi insiden dan cara penyelesaian tantangan CTF tim Anda untuk penilaian akhir dewan juri.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchWriteupStatus}
          disabled={loading}
          className="gap-2 text-xs border-border h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} /> Refresh Status
        </Button>
      </div>

      {/* Require Team Warning Alert */}
      {requireTeam && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Akses Upload Writeup Terkunci
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40 font-mono">
                  Wajib Memiliki Squad
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anda harus membentuk atau bergabung ke dalam Tim / Squad untuk mengakses dan mengunggah dokumen laporan investigasi writeup.
              </p>
            </div>
          </div>
          <Link to="/team">
            <Button size="sm" className="gap-1.5 text-xs whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <Users className="h-3.5 w-3.5" /> Buka Menu Squad (/team)
            </Button>
          </Link>
        </div>
      )}

      {/* Require Token Warning Alert */}
      {requireToken && (
        <div className="p-4 rounded-xl border border-primary/40 bg-primary/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Access Token Diperlukan
                <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/40 font-mono">
                  Akses Arena
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anda belum menukarkan Access Token event. Silakan masukkan token akses Anda terlebih dahulu di Arena.
              </p>
            </div>
          </div>
          <Link to="/dashboard">
            <Button size="sm" className="gap-1.5 text-xs whitespace-nowrap font-bold">
              <Key className="h-3.5 w-3.5" /> Masukkan Token Akses
            </Button>
          </Link>
        </div>
      )}

      {/* Evaluation Result Alert (if graded by jury) */}
      {isEvaluated && (
        <Card className="bg-gradient-to-r from-emerald-950/40 via-card to-card border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Hasil Evaluasi Dewan Juri</h3>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-mono">
                      TERVERIFIKASI
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dinilai oleh: <span className="font-semibold text-foreground">@{writeup.evaluated_by || 'Juri Panitia'}</span> pada {new Date(writeup.evaluated_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Squad: <span className="font-bold text-foreground">{data?.team?.name}</span> • Total Scoreboard: <span className="font-mono font-bold text-primary">{data?.team?.score || 0} PTS</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-border sm:pl-6">
                <div className="text-right">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground block">Poin Flag CTF</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {(data?.team?.score || 0) - (data?.team?.writeup_score || 0)} PTS
                  </span>
                </div>
                <div className="text-right border-l border-border/60 pl-4">
                  <span className="text-[11px] uppercase font-semibold text-emerald-400 block">Poin Writeup</span>
                  <span className="text-3xl font-black font-mono text-emerald-400">+{writeup.score} PTS</span>
                </div>
              </div>
            </div>

            {writeup.feedback && (
              <div className="mt-4 pt-4 border-t border-border/60 bg-muted/20 p-3.5 rounded-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" /> Catatan / Feedback Juri:
                </p>
                <p className="text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {writeup.feedback}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Guidelines & Rules Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider font-bold flex items-center gap-2 text-foreground">
            <Info className="h-4 w-4 text-primary" /> Petunjuk Pengumpulan Laporan / Writeup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            • <strong>Penentuan Juara</strong>: Penilaian laporan investigasi menentukan validitas penyelesaian flag dan memberikan bobot poin evaluasi akhir.
          </p>
          <p>
            • <strong>Format File yang Diterima</strong>: <code className="text-primary font-mono font-semibold">.PDF, .ZIP, .RAR, .DOCX, .MD</code> (Ukuran maksimal: <strong>50 MB</strong>).
          </p>
          <p>
            • <strong>Isi Dokumen yang Dianjurkan</strong>: Metodologi investigasi, bukti temuan (screenshot / command artifacts), exploit script, mitigasi insiden, dan flag yang didapatkan.
          </p>
          <p>
            • <strong>Perubahan Dokumen</strong>: Anda dapat mengunggah ulang dokumen untuk mengganti versi sebelumnya kapan saja selama masa pengumpulan masih dibuka.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Submission Status Card */}
        <Card className="bg-card border-border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider font-bold flex items-center justify-between">
                <span>Status Dokumen Terkirim</span>
                {writeup ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Sudah Diunggah
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                    Belum Mengunggah
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {writeup ? (
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-foreground truncate">{writeup.file_name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatBytes(writeup.file_size)} • Diunggah {new Date(writeup.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {writeup.notes && (
                    <div className="text-xs bg-background/60 p-2.5 rounded border border-border">
                      <span className="font-semibold text-muted-foreground block mb-0.5">Catatan Tim:</span>
                      <p className="text-foreground italic">{writeup.notes}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadFile}
                      className="gap-2 text-xs h-8 flex-1"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" /> Unduh File Terkirim
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
                  <FileArchive className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold text-foreground">Belum ada file writeup yang dikirimkan</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Gunakan form di samping untuk mengunggah dokumen writeup tim Anda.
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="pt-2 text-[11px] text-muted-foreground border-t border-border">
            Arena Event: <strong className="text-foreground ml-1">{event?.name || 'RISERANGER 2 Official'}</strong>
          </CardFooter>
        </Card>

        {/* Upload Form Card */}
        <Card className={`bg-card border-border ${requireTeam || requireToken ? 'opacity-85' : ''}`}>
          <form onSubmit={handleSubmitWriteup}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wider font-bold">
                  {writeup ? 'Perbarui File Writeup (Re-Upload)' : 'Unggah File Laporan'}
                </CardTitle>
                {(requireTeam || requireToken) && (
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                    <Lock className="h-3 w-3" /> Fitur Dinonaktifkan
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {requireTeam
                  ? 'Pengunggahan dinonaktifkan karena Anda belum bergabung dalam squad tim manapun.'
                  : requireToken
                    ? 'Pengunggahan dinonaktifkan karena Anda belum menukarkan token akses arena.'
                    : 'Pilih file dokumen investigasi tim (.pdf / .zip / .docx / .md).'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Drop Zone Area */}
              <div
                onDragOver={(e) => {
                  if (requireTeam || requireToken) return;
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  if (requireTeam || requireToken) return;
                  handleFileDrop(e);
                }}
                onClick={() => {
                  if (requireTeam || requireToken) {
                    toast.error(requireTeam ? 'Anda harus bergabung ke dalam Tim / Squad terlebih dahulu.' : 'Anda harus memasukkan Access Token terlebih dahulu.');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${requireTeam || requireToken
                    ? 'border-border/60 bg-muted/30 cursor-not-allowed opacity-75'
                    : isDragOver
                      ? 'border-primary bg-primary/5 cursor-pointer'
                      : 'border-border hover:border-primary/50 bg-muted/20 cursor-pointer'
                  }`}
              >
                {requireTeam || requireToken ? (
                  <div className="space-y-1.5 py-1">
                    <Lock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      {requireTeam ? 'Form Upload Terkunci (Perlu Squad)' : 'Form Upload Terkunci (Perlu Token)'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">
                      {requireTeam
                        ? 'Silakan buat atau gabung ke dalam Squad di menu /team untuk mengaktifkan form ini.'
                        : 'Silakan verifikasi Access Token di menu Dashboard.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-primary">{selectedFile.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatBytes(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-foreground">Klik atau tarik file ke sini</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Format PDF, ZIP, RAR, DOCX, MD (Maks 50MB)</p>
                      </div>
                    )}
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf, .zip, .rar, .7z, .docx, .doc, .md, .txt"
                  onChange={handleFileChange}
                  disabled={requireTeam || requireToken}
                  className="hidden"
                />
              </div>

              {/* Notes Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Catatan Tambahan (Opsional)</label>
                <Textarea
                  placeholder={requireTeam ? 'Form terkunci...' : 'Contoh: Laporan Investigasi Insiden PT XYZ - Dilengkapi PoC Exploit & Rekomendasi Mitigasi...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={requireTeam || requireToken}
                  className={`text-xs resize-none h-20 ${requireTeam || requireToken ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={uploading || !selectedFile || requireTeam || requireToken}
                className="w-full gap-2 font-medium"
              >
                {requireTeam
                  ? 'Upload Terkunci: Wajib Memiliki Tim'
                  : requireToken
                    ? 'Upload Terkunci: Perlu Access Token'
                    : uploading
                      ? 'Mengunggah Dokumen...'
                      : writeup
                        ? 'Perbarui File Dokumen'
                        : 'Kirim Laporan Writeup'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
