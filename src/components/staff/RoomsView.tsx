'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, RefreshCw, Check, Pencil, X as XIcon,
  DoorOpen, Upload, FileSpreadsheet, FileText,
} from 'lucide-react';
import {
  getAllHotelRooms, bulkInsertRooms, deleteRoom, createRoom,
  updateRoomType, updateRoomTypeBatch,
} from '@/lib/supabase';
import type { HotelRoom } from '@/lib/supabase';

const TEAL = '#0D9488';

export default function RoomsView({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsedRooms, setParsedRooms] = useState<{ room_number: string; room_type: string; floor: number }[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editTypeVal, setEditTypeVal] = useState('');
  const dragRef = useRef<HTMLDivElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rooms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rooms.map(r => r.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected rooms?`)) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteRoom(id);
      }
      setMessage({ type: 'success', text: `Deleted ${selectedIds.size} rooms.` });
      setSelectedIds(new Set());
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const handleBatchSetType = async () => {
    if (selectedIds.size === 0) return;
    const newType = prompt('Set room type for all selected rooms:', 'Standard');
    if (!newType) return;
    setSaving(true);
    try {
      await updateRoomTypeBatch(selectedIds, newType);
      setMessage({ type: 'success', text: `Updated ${selectedIds.size} rooms to "${newType}".` });
      setSelectedIds(new Set());
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const handleSaveEditType = async (roomId: string) => {
    setSaving(true);
    try {
      await updateRoomType(roomId, editTypeVal);
      setEditingRoom(null);
      setEditTypeVal('');
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const loadRooms = useCallback(async () => {
    setLoading(true);
    const data = await getAllHotelRooms(hotelId);
    setRooms(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const results: { room_number: string; room_type: string; floor: number }[] = [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const roomIdx = headers.findIndex(h => /room|number|unit|apt/i.test(h));
    const typeIdx = headers.findIndex(h => /type|category|class|kind/i.test(h));
    const floorIdx = headers.findIndex(h => /floor|level/i.test(h));

    if (roomIdx < 0) {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[0]) results.push({ room_number: cols[0], room_type: cols[1] || '', floor: parseInt(cols[2]) || 0 });
      }
    } else {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[roomIdx]) results.push({
          room_number: cols[roomIdx],
          room_type: typeIdx >= 0 ? cols[typeIdx] || '' : '',
          floor: floorIdx >= 0 ? parseInt(cols[floorIdx]) || 0 : 0,
        });
      }
    }
    return results;
  };

  const parseExcel = async (file: File): Promise<{ room_number: string; room_type: string; floor: number }[]> => {
    const readXlsxFile = (await import('read-excel-file/browser')).default;
    const sheets = await readXlsxFile(file);
    const rows = (sheets[0]?.data || []) as unknown as (string | number | null)[][];

    const results: { room_number: string; room_type: string; floor: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Find header row(s) that contain "ROOM" or similar
      const hasHeader = row.some(c => /room|number|unit|apt/i.test(String(c ?? '').trim()));
      if (hasHeader) { continue; }

      // Skip rows that look like labels (MONTH, DETAIL, NOTE, etc.)
      const textCells = row.filter(c => String(c ?? '').trim().length > 0);
      if (textCells.length === 0) continue;
      const allNonNumeric = textCells.every(c => isNaN(Number(String(c).trim())));
      if (allNonNumeric) continue;

      // Scan every cell for 3-4 digit room numbers
      for (const cell of row) {
        const val = String(cell ?? '').trim();
        if (!val || val.length < 2) continue;
        // Match room numbers like 102, 201, 230, 105A etc. but not things like 2025 (pins)
        const num = Number(val);
        if (!isNaN(num) && num >= 50 && num <= 9999) {
          const floor = num >= 100 ? Math.floor(num / 100) : 0;
          // Deduplicate within this parse session
          if (!results.some(r => r.room_number === String(num))) {
            results.push({ room_number: String(num), room_type: '', floor });
          }
        }
      }
    }

    return results.sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) { setMessage({ type: 'error', text: 'Could not find room numbers in this file.' }); return; }
        setParsedRooms(parsed);
        setMessage({ type: 'success', text: `Parsed ${parsed.length} rooms from CSV. Review below, then click "Replace All Rooms".` });
      } else if (ext === 'xlsx') {
        const parsed = await parseExcel(file);
        if (parsed.length === 0) { setMessage({ type: 'error', text: 'Could not find room numbers in this spreadsheet.' }); return; }
        setParsedRooms(parsed);
        setMessage({ type: 'success', text: `Parsed ${parsed.length} rooms from Excel. Review below, then click "Replace All Rooms".` });
      } else if (ext === 'pdf') {
        try {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
          const data = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\\n';
          }
          const roomRegex = /\b(\d{3,4}[A-Z]?)\b/g;
          const matches = fullText.match(roomRegex);
          if (matches && matches.length > 0) {
            const unique = Array.from(new Set(matches)).map(r => ({ room_number: r, room_type: '', floor: parseInt(r) > 100 ? Math.floor(parseInt(r) / 100) : 0 }));
            setParsedRooms(unique);
            setMessage({ type: 'success', text: `Extracted ${unique.length} rooms from PDF. Review below, then click "Replace All Rooms".` });
          } else {
            setMessage({ type: 'error', text: 'Could not find room numbers in this PDF. Try a CSV or Excel file instead.' });
          }
        } catch {
          setMessage({ type: 'error', text: 'Failed to parse PDF. Try CSV or Excel instead.' });
        }
      } else {
        setMessage({ type: 'error', text: 'Unsupported file. Upload .csv, .xlsx, or .pdf' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: `Error parsing file: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleReplace = async () => {
    if (parsedRooms.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await bulkInsertRooms(hotelId, parsedRooms);
      setMessage({ type: 'success', text: `Replaced with ${parsedRooms.length} rooms. Saved to database.` });
      setParsedRooms([]);
      setFileName('');
      setManualMode(false);
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed to save'}` });
    }
    setSaving(false);
  };

  const handleAddManual = async () => {
    if (!newRoomNum.trim()) return;
    setSaving(true);
    try {
      await createRoom(hotelId, { room_number: newRoomNum.trim(), room_type: newRoomType, floor: parseInt(newRoomNum.trim()) > 100 ? Math.floor(parseInt(newRoomNum.trim()) / 100) : 0 });
      setNewRoomNum('');
      setNewRoomType('');
      setMessage({ type: 'success', text: `Room ${newRoomNum.trim()} added.` });
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed to add room'}` });
    }
    setSaving(false);
  };

  const handleDeleteRoom = async (id: string) => {
    await deleteRoom(id);
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div className="p-8"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mt-12" /></div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Room Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{hotelName} &middot; {rooms.length} rooms on file</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setManualMode(!manualMode)}
            className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} /> {manualMode ? 'Bulk Upload' : 'Add Manually'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-[13px] font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {manualMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-3">Add Room Manually</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text" value={newRoomNum} onChange={e => setNewRoomNum(e.target.value)}
              placeholder="Room number (e.g. 205)"
              className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 text-[13px] outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            />
            <input
              type="text" value={newRoomType} onChange={e => setNewRoomType(e.target.value)}
              placeholder="Type (optional)"
              className="w-32 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 text-[13px] outline-none"
            />
          </div>
          <button
            onClick={handleAddManual}
            disabled={saving || !newRoomNum.trim()}
            className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50"
            style={{ backgroundColor: '#0D9488' }}
          >
            {saving ? 'Adding...' : 'Add Room'}
          </button>
        </div>
      )}

      {!manualMode && (
        <>
          <div
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-teal-400 transition-colors cursor-pointer mb-4"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.xlsx,.pdf';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              input.onchange = (e: any) => { if (e.target?.files?.[0]) handleFile(e.target.files[0]); };
              input.click();
            }}
          >
            <Upload size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-gray-600 mb-1">Upload room list</p>
            <p className="text-[11px] text-gray-400">
              {fileName ? `Selected: ${fileName}` : 'CSV, Excel (.xlsx), or PDF &middot; Click or drag'}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> CSV</span>
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</span>
              <span className="flex items-center gap-1"><FileText size={14} /> PDF</span>
            </div>
          </div>

          {parsedRooms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-gray-800">Preview ({parsedRooms.length} rooms)</h3>
                <button
                  onClick={handleReplace}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#0D9488' }}
                >
                  {saving ? 'Saving...' : 'Replace All Rooms'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Room #</th>
                      <th className="text-left px-4 py-2 font-semibold">Type</th>
                      <th className="text-left px-4 py-2 font-semibold">Floor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedRooms.slice(0, 200).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{r.room_number}</td>
                        <td className="px-4 py-2 text-gray-500">{r.room_type || '&mdash;'}</td>
                        <td className="px-4 py-2 text-gray-500">{r.floor || '&mdash;'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-800">Existing Rooms ({rooms.length})</h3>
          <div className="flex items-center gap-2">
            {(selectedIds.size > 0) && (
              <>
                <span className="text-[11px] text-gray-500">{selectedIds.size} selected</span>
                <button onClick={handleBatchSetType} disabled={saving}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Set Type
                </button>
                <button onClick={handleBatchDelete} disabled={saving}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-red-500 hover:bg-red-50">
                  Delete Selected
                </button>
              </>
            )}
            <button onClick={loadRooms} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-600">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
        {rooms.length === 0 ? (
          <div className="p-8 text-center">
            <DoorOpen size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500 mb-1">No rooms uploaded yet.</p>
            <p className="text-[12px] text-gray-400">Upload a CSV or Excel file with your room list, or add rooms manually.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase sticky top-0">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" checked={rooms.length > 0 && selectedIds.size === rooms.length}
                      onChange={toggleSelectAll} className="accent-teal-500 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-2 font-semibold">Room #</th>
                  <th className="text-left px-4 py-2 font-semibold">Type</th>
                  <th className="text-left px-4 py-2 font-semibold">Floor</th>
                  <th className="text-right px-4 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map(room => (
                  <tr key={room.id} className={`hover:bg-gray-50 ${selectedIds.has(room.id) ? 'bg-teal-50/30' : ''}`}>
                    <td className="w-8 px-2 py-2">
                      <input type="checkbox" checked={selectedIds.has(room.id)}
                        onChange={() => toggleSelect(room.id)} className="accent-teal-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{room.room_number}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {editingRoom === room.id ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={editTypeVal}
                            onChange={e => setEditTypeVal(e.target.value)}
                            className="w-24 bg-gray-50 rounded px-2 py-1 text-[12px] border border-gray-200 outline-none"
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditType(room.id); if (e.key === 'Escape') setEditingRoom(null); }}
                            autoFocus />
                          <button onClick={() => handleSaveEditType(room.id)} className="text-teal-600 hover:text-teal-800"><Check size={13} /></button>
                          <button onClick={() => setEditingRoom(null)} className="text-gray-400 hover:text-gray-600"><XIcon size={13} /></button>
                        </div>
                      ) : (
                        <span>{room.room_type || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{room.floor || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditingRoom(room.id); setEditTypeVal(room.room_type || ''); }}
                          className="text-gray-400 hover:text-teal-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}