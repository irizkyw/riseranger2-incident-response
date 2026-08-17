import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  Award,
  MessageSquare,
  AlertCircle,
  FileArchive,
  Eye,
  CheckCircle2,
  FileCode,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/services/api';

interface WriteupViewerModalProps {
  writeup: any | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onEvaluated?: () => void;
}

export const WriteupViewerModal: React.FC<WriteupViewerModalProps> = ({
  writeup,
  isOpen,
  onClose,
  isAdmin = false,
  onEvaluated
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Admin evaluation form state
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  const fileName = writeup?.file_name || 'writeup.pdf';
  const ext = '.' + (fileName.split('.').pop() || '').toLowerCase();
  const isPdf = ext === '.pdf';
  const isText = ext === '.txt' || ext === '.md' || ext === '.json';
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);
  const isArchive = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'].includes(ext);

  useEffect(() => {
    if (!isOpen || !writeup?.id) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setTextContent(null);
      return;
    }

    setScore(writeup.score || 0);
    setFeedback(writeup.feedback || '');
    setLoading(true);
    setError(null);

    let active = true;

    const loadContent = async () => {
      try {
        const res = await api.get(`/writeup/view/${writeup.id}`, {
          responseType: isText ? 'text' : 'blob'
        });

        if (!active) return;

        if (isText) {
          setTextContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
        } else {
          const mime = isPdf ? 'application/pdf' : String(res.headers['content-type'] || 'application/octet-stream');
          const blob = new Blob([res.data], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err: any) {
        if (!active) return;
        console.error('Failed to load writeup for viewer:', err);
        setError('Gagal memuat dokumen writeup dari server storage.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [isOpen, writeup?.id]);

  const handleDownload = async () => {
    if (!writeup?.id) return;
    try {
      const res = await api.get(`/writeup/download/${writeup.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Mengunduh ${fileName}...`);
    } catch (err) {
      toast.error('Gagal mengunduh file writeup.');
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeup?.id) return;

    setSaveLoading(true);
    try {
      const res = await api.post(`/writeup/admin/evaluate/${writeup.id}`, {
        score: Number(score) || 0,
        feedback: feedback.trim()
      });

      toast.success(res.data.message || 'Penilaian writeup berhasil disimpan!');
      if (onEvaluated) onEvaluated();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan evaluasi.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`bg-card border-border flex flex-col p-0 transition-all duration-200 ${
          isFullscreen 
            ? 'w-[98vw] max-w-[98vw] h-[96vh] max-h-[96vh]' 
            : 'sm:max-w-5xl h-[88vh] max-h-[88vh]'
        }`}
      >
        {/* Document Header */}
        <div className="p-4 pr-14 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  {fileName}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0">
                  {ext.replace('.', '')}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span>Squad: <strong className="text-foreground">{writeup?.team?.name || 'My Squad'}</strong></span>
                <span>•</span>
                <span>Size: {Math.round((writeup?.file_size || 0) / 1024)} KB</span>
                {writeup?.user?.username && (
                  <>
                    <span>•</span>
                    <span>Submitter: <strong className="text-foreground">@{writeup.user.username}</strong></span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto mr-2">
            {blobUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenNewTab}
                className="h-8 text-xs gap-1.5"
                title="Open Document in New Tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Open in New Tab</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5"
              title="Download Document"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-background">
          {/* Document Preview Left Side */}
          <div className="flex-1 h-full overflow-y-auto relative flex flex-col items-center justify-center p-2 bg-muted/10">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading and rendering document preview...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <p className="text-sm font-bold text-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Download File Directly
                </Button>
              </div>
            ) : isPdf && blobUrl ? (
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=1`}
                title={fileName}
                className="w-full h-full rounded border border-border shadow-inner bg-card"
              />
            ) : isText && textContent ? (
              <div className="w-full h-full p-6 overflow-y-auto bg-card rounded border border-border font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {textContent}
              </div>
            ) : isImage && blobUrl ? (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={blobUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain rounded border border-border shadow-lg"
                />
              </div>
            ) : (
              /* Non-renderable format (ZIP, RAR, DOCX, etc.) */
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-lg bg-card rounded-xl border border-border shadow-md">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {isArchive ? <FileArchive className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground uppercase tracking-wide">{fileName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    This file is format <strong>{ext.toUpperCase()}</strong> and is ready for offline evaluation.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full justify-center">
                  <Button onClick={handleDownload} className="gap-2 font-bold shadow-lg">
                    <Download className="h-4 w-4" />
                    Download Writeup Document ({Math.round((writeup?.file_size || 0) / 1024)} KB)
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Evaluation Panel Right Side */}
          {isAdmin && (
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card p-4 overflow-y-auto flex flex-col justify-between shrink-0">
              <form onSubmit={handleSaveEvaluation} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Award className="h-5 w-5 text-yellow-400" />
                  <div>
                    <h4 className="text-xs font-black font-outfit uppercase tracking-wider text-foreground">
                      Writeup Evaluation (Jury / Admin)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Assign score points and jury feedback.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-foreground">Evaluation Score</label>
                    <span className="text-xs font-mono font-black text-yellow-400">{score} PTS</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="font-mono text-sm font-bold h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground">Jury Feedback & Analysis</label>
                  <Textarea
                    placeholder="Provide analysis feedback, methodology review, and praise..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    className="text-xs leading-relaxed"
                  />
                </div>

                {writeup?.notes && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                    <p className="font-bold text-muted-foreground text-[10px] uppercase">Author Notes:</p>
                    <p className="text-foreground/90 italic">"{writeup.notes}"</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={saveLoading} 
                  className="w-full gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saveLoading ? 'Saving...' : 'Save Evaluation'}
                </Button>
              </form>

              {writeup?.evaluated_by && (
                <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                  <span>Evaluated by:</span>
                  <span className="font-bold text-foreground">@{writeup.evaluated_by}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
