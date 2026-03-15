'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileText, ArrowLeft, Loader2, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ImportLeadsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });

      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: row.type || 'customer',
              company_name: row.company_name || row.company || 'Unknown',
              contact_name: row.contact_name || row.name || 'Unknown',
              contact_title: row.contact_title || row.title || null,
              contact_email: row.contact_email || row.email || null,
              contact_twitter: row.contact_twitter || row.twitter || null,
              contact_linkedin: row.contact_linkedin || row.linkedin || null,
              company_description: row.company_description || null,
              source: row.source || 'csv_import',
              priority: row.priority || 'medium',
              notes: row.notes || null,
            }),
          });
          if (res.ok) imported++;
          else errors.push(`Row ${i + 2}: ${(await res.json()).error || 'Unknown error'}`);
        } catch (e) {
          errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Failed'}`);
        }
      }

      setResult({ imported, errors });
      if (imported > 0) toast.success(`Imported ${imported} leads`);
      if (errors.length) toast.error(`${errors.length} rows failed`);
    } catch {
      toast.error('Failed to read file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-zinc-500" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Import Leads</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Upload a CSV file to bulk import leads</p>
        </div>
      </div>

      {/* Expected format */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-4">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Expected CSV columns:</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          type, contact_name, company_name, contact_email, contact_title, product_name, fund_name, contact_twitter, contact_linkedin, source, priority, notes
        </p>
      </div>

      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800/50 cursor-pointer hover:border-red-400 dark:hover:border-red-600 transition-colors"
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
            <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-zinc-400 mb-2" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Click to upload CSV</p>
          </>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Preview (first 5 rows):</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800">
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-200 dark:border-zinc-700">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Importing...' : 'Import Leads'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {result.imported > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">{result.imported} leads imported successfully</span>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">{result.errors.length} errors</span>
              </div>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => router.push('/leads')}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            Back to Leads
          </button>
        </div>
      )}
    </div>
  );
}
