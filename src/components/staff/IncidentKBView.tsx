'use client';

// ============================================================
// INCIDENT / KNOWLEDGE BASE VIEW (paste incident → AI suggestion → save)
// Extracted from src/app/staff/page.tsx (V2 Phase 7)
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Copy, Trash2, BookOpen } from 'lucide-react';
import { authedApiHeaders } from '@/lib/supabase';
import {
  listKbSuggestionsByStatus, createKbSuggestionPending, approveKbSuggestion, rejectKbSuggestion,
  deleteKbSuggestion, suggestResponse, type OpRecord,
} from '@/lib/opsStore';

const TEAL = '#158A7C';

export default function IncidentKBView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userName: string }) {
  const [approved, setApproved] = useState<OpRecord[]>([]);
  const [pending, setPending] = useState<OpRecord[]>([]);
  const [rejected, setRejected] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState('');
  const [category, setCategory] = useState<string>('Complaint');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [ask, setAsk] = useState('');
  const [askResult, setAskResult] = useState<{ id: string; title: string; category: string; situation: string; response: string; score: number } | null>(null);
  const [askNotFound, setAskNotFound] = useState(false);
  const [askCopied, setAskCopied] = useState(false);
  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfCategory, setPdfCategory] = useState('SOP');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [a, p, r] = await Promise.all([
      listKbSuggestionsByStatus(hotelId, 'active'),
      listKbSuggestionsByStatus(hotelId, 'pending'),
      listKbSuggestionsByStatus(hotelId, 'rejected'),
    ]);
    setApproved(a || []);
    setPending(p || []);
    setRejected(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hotelId]);

  const generateSuggestion = () => {
    if (!incident) return;
    const result = suggestResponse(incident, category as any);
    setSuggestion(result.response);
  };

  const save = async () => {
    if (!incident || !suggestion) return;
    setSaving(true);
    try {
      // New flow: staff submissions start in 'pending' for admin review
      await createKbSuggestionPending(hotelId, {
        title: category + ' response',
        category,
        situation: incident,
        response: suggestion,
        added_by: userName,
      });
      await load();
      setIncident('');
      setSuggestion('');
    } finally {
      setSaving(false);
    }
  };

  const uploadPdf = async () => {
    if (!pdfFile || !pdfTitle.trim()) return;
    setPdfUploading(true);
    setPdfMsg(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });
      const headers = await authedApiHeaders();
      const uploadRes = await fetch('/api/kb-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ base64, filename: pdfFile.name, hotelId }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) throw new Error(uploadData.error || 'Upload failed');

      // Create an approved KB entry linking to the PDF
      await createKbSuggestionPending(hotelId, {
        title: pdfTitle.trim(),
        category: pdfCategory,
        situation: pdfTitle.trim(),
        response: `PDF Document: ${uploadData.filename}`,
        added_by: userName,
        pdf_url: uploadData.url,
        pdf_filename: uploadData.filename,
      } as any);
      // Auto-approve since admin/manager uploaded it
      const fresh = await listKbSuggestionsByStatus(hotelId, 'pending');
      const justAdded = fresh?.[fresh.length - 1];
      if (justAdded) await approveKbSuggestion(justAdded.id);

      await load();
      setPdfTitle('');
      setPdfFile(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      setPdfMsg({ ok: true, text: `"${pdfTitle.trim()}" uploaded successfully.` });
    } catch (err: any) {
      setPdfMsg({ ok: false, text: err.message || 'Upload failed' });
    } finally {
      setPdfUploading(false);
    }
  };

  const approve = async (id: string) => {
    await approveKbSuggestion(id);
    await load();
  };

  const reject = async (id: string) => {
    if (!confirm('Reject this entry? It will be moved to Rejected and not appear in search.')) return;
    await rejectKbSuggestion(id);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this KB entry?')) return;
    await deleteKbSuggestion(id);
    await load();
  };

  const askKb = () => {
    if (!ask.trim()) { setAskResult(null); setAskNotFound(false); return; }
    const q = ask.toLowerCase().trim();
    // Score each approved entry by keyword overlap on situation + response + category
    const scored = approved.map(e => {
      const d = e.details as any;
      const haystack = [d.situation || '', d.response || '', d.category || '', d.title || ''].join(' ').toLowerCase();
      const qWords = q.split(/\s+/).filter(w => w.length > 1);
      let score = 0;
      for (const w of qWords) {
        if (haystack.includes(w)) score += 2;
        // Whole phrase bonus
        if (haystack.includes(q)) score += 3;
      }
      // Exact phrase match big bonus
      if (haystack.includes(q)) score += 5;
      return { id: e.id, title: d.title, category: d.category, situation: d.situation, response: d.response, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      setAskResult(null);
      setAskNotFound(true);
    } else {
      setAskResult(scored[0]);
      setAskNotFound(false);
      setAskCopied(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const categories = [
    { key: 'SOP', label: 'SOP', icon: '📋' },
    { key: 'Best Practice', label: 'Best Practice', icon: '✅' },
    { key: 'GM Guidance', label: 'GM Guidance', icon: '🎯' },
    { key: 'Complaint', label: 'Complaint', icon: '⚠️' },
    { key: 'Service', label: 'Service', icon: '💬' },
    { key: 'Procedures', label: 'Procedures', icon: '⚙️' },
    { key: 'Safety', label: 'Safety', icon: '🚨' },
    { key: 'General', label: 'General', icon: '📌' },
  ];

  const visible = filter === 'all'
    ? [...pending, ...approved, ...rejected]
    : filter === 'pending' ? pending
    : filter === 'rejected' ? rejected
    : approved;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Write Answers</h1>
        <p className="text-[12px] text-gray-500">Knowledge base · best practices · SOPs · GM guidance · what to do in any situation</p>
      </div>

      {/* Ask the KB — chatbot-style search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
          <Search size={11} /> Search answers
        </label>
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={ask}
            onChange={e => { setAsk(e.target.value); if (!e.target.value) { setAskResult(null); setAskNotFound(false); } }}
            onKeyDown={e => { if (e.key === 'Enter') askKb(); }}
            placeholder="Search: check-in, breakfast, noise complaint, late checkout..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100"
          />
          <button onClick={askKb} disabled={!ask.trim()} className="px-4 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            Ask
          </button>
        </div>

        {askResult && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold capitalize">{askResult.category}</span>
              <span className="text-[10px] text-gray-500">{askResult.title}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Situation</p>
            <p className="text-[12px] text-gray-700">{askResult.situation}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Suggested response</p>
            <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{askResult.response}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { navigator.clipboard.writeText(askResult.response); setAskCopied(true); setTimeout(() => setAskCopied(false), 1500); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Copy size={11} /> {askCopied ? 'Copied' : 'Copy response'}
              </button>
            </div>
          </div>
        )}

        {askNotFound && ask.trim() && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[12px] text-gray-600">
            No match found for "{ask}". {isAdmin ? 'Check the Pending tab below.' : 'Let your manager know or log a new entry below for admin review.'}
          </div>
        )}
      </div>

      {/* Submit a new entry */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-gray-700" />
          <p className="text-[14px] font-bold text-gray-900">Add a new answer</p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">SOPs, best practices, procedures, and GM guidance. Staff submissions go to <span className="font-semibold">Pending</span> for admin review. Admins can publish directly.</p>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
        <div className="flex flex-wrap gap-1 mt-1 mb-3">
          {categories.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${category === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={category === c.key ? { backgroundColor: TEAL } : {}}>
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Situation / Topic</label>
        <textarea value={incident} onChange={e => setIncident(e.target.value)} rows={3} placeholder="e.g. How to handle a late checkout, breakfast hours, noise complaint procedure..." className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
        <button onClick={generateSuggestion} disabled={!incident} className="mt-3 w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          ✨ Suggest Response
        </button>
        {suggestion && (
          <>
            <label className="text-[10px] font-bold text-gray-500 uppercase mt-3 block">Suggested response (edit if needed)</label>
            <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} rows={5} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{saving ? 'Submitting…' : 'Submit for Review'}</button>
              <button onClick={() => { setIncident(''); setSuggestion(''); }} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Clear</button>
            </div>
          </>
        )}
      </div>

      {/* PDF Upload — admin/manager only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">📄</span>
            <p className="text-[14px] font-bold text-gray-900">Upload PDF to Knowledge Base</p>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">Upload SOPs, manuals, or policy documents. PDFs are stored and linked in the KB for staff to download.</p>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Document Title</label>
          <input
            type="text"
            value={pdfTitle}
            onChange={e => setPdfTitle(e.target.value)}
            placeholder="e.g. Front Desk SOP v2, Emergency Procedures"
            className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-[13px] border border-gray-100 mt-1 mb-3"
          />
          <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
          <div className="flex flex-wrap gap-1 mt-1 mb-3">
            {categories.map(c => (
              <button key={c.key} onClick={() => setPdfCategory(c.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${pdfCategory === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={pdfCategory === c.key ? { backgroundColor: TEAL } : {}}>
                <span className="mr-1">{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">PDF File</label>
          <div
            className="mt-1 mb-3 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
            onClick={() => pdfInputRef.current?.click()}
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[20px]">📄</span>
                <span className="text-[13px] font-semibold text-gray-700">{pdfFile.name}</span>
                <span className="text-[11px] text-gray-400">({(pdfFile.size / 1024).toFixed(0)} KB)</span>
              </div>
            ) : (
              <div>
                <span className="text-[28px] block mb-1">📂</span>
                <span className="text-[12px] text-gray-500">Click to select a PDF file</span>
                <span className="text-[11px] text-gray-400 block mt-0.5">Max 10 MB</span>
              </div>
            )}
          </div>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0] || null;
              setPdfFile(f);
              setPdfMsg(null);
              if (f && !pdfTitle) setPdfTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '));
            }}
          />
          {pdfMsg && (
            <div className={`text-[12px] px-3 py-2 rounded-xl mb-3 ${pdfMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {pdfMsg.ok ? '✓ ' : '✗ '}{pdfMsg.text}
            </div>
          )}
          <button
            onClick={uploadPdf}
            disabled={!pdfFile || !pdfTitle.trim() || pdfUploading}
            className="w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            {pdfUploading ? <><span className="animate-spin">⏳</span> Uploading…</> : '⬆ Upload PDF'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { key: 'approved', label: `✓ Approved (${approved.length})` },
          ...(isAdmin ? [{ key: 'pending', label: `⏳ Pending (${pending.length})` }] : []),
          ...(isAdmin ? [{ key: 'rejected', label: `✗ Rejected (${rejected.length})` }] : []),
          ...(isAdmin ? [{ key: 'all', label: `All (${approved.length + pending.length + rejected.length})` }] : []),
        ] as { key: 'approved' | 'pending' | 'rejected' | 'all'; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${filter === t.key ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`} style={filter === t.key ? { backgroundColor: TEAL } : {}}>{t.label}</button>
        ))}
      </div>

      {/* KB entries */}
      {visible.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">
            {filter === 'pending' ? 'No pending entries' : filter === 'rejected' ? 'No rejected entries' : 'No answers yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {filter === 'pending' ? 'New staff submissions will appear here for your review.' : 'Share what you know below to start adding answers.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(e => {
            const d = e.details as any;
            const isPending = e.status === 'pending';
            const isRejected = e.status === 'rejected';
            return (
              <details key={e.id} className={`bg-white rounded-2xl border shadow-sm group ${isPending ? 'border-amber-200' : isRejected ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                <summary className="p-4 cursor-pointer list-none flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">{d.category}</span>
                      {isPending && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">⏳ Pending</span>}
                      {isRejected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">✗ Rejected</span>}
                      <span className="text-[10px] text-gray-400">{e.created_at?.split('T')[0]}</span>
                      <span className="text-[10px] text-gray-400">by {d.added_by}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 line-clamp-2">{d.situation}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={ev => { ev.preventDefault(); del(e.id); }} className="p-1 text-gray-400 hover:text-gray-700 ml-2" title="Delete"><Trash2 size={14} /></button>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  {d.pdf_url ? (
                    <div className="mt-3">
                      <a
                        href={d.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-[12px]"
                        style={{ backgroundColor: TEAL }}
                      >
                        <span>📄</span> View / Download PDF
                      </a>
                      <p className="text-[10px] text-gray-400 mt-1">{d.pdf_filename}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-3 mb-1">Suggested response</p>
                      <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{d.response}</p>
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {!d.pdf_url && (
                      <button onClick={() => { navigator.clipboard.writeText(d.response); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                        <Copy size={11} /> Copy
                      </button>
                    )}
                    {isAdmin && isPending && (
                      <>
                        <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => reject(e.id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {isAdmin && isRejected && (
                      <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
