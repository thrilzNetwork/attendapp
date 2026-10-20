'use client';

import { ReactNode } from 'react';

export interface SharedRoomTile {
  room: string;
  /** Tile state decides color: teal (done/ok), orange (due/attn), red (open/blocked), gray (idle). */
  state?: 'done' | 'due' | 'open' | 'idle';
  /** Small uppercase status label under the room number (e.g. 'done', '2 PM due', 'open'). */
  label?: string;
  /** Optional badge count in the top-right corner (e.g. open work orders). */
  badge?: number;
  /** Optional dot in the bottom-left corner (e.g. serviced today). */
  dot?: boolean;
}

/**
 * RoomGridFloors — the floor-grouped room grid used by the Room Safety (smoke detector)
 * inspection screen. Shared export so Housekeeping, Maintenance, and Inspections render
 * the SAME grid: floor sections, 4/6-across tiles, identical tile anatomy.
 */
export default function RoomGridFloors({
  rooms,
  onPick,
  disabled,
  tileStates,
  children,
}: {
  rooms: { room_number: string }[];
  onPick?: (room: string) => void;
  disabled?: boolean;
  /** Maps room number → tile visual state; defaults to idle (gray) for all rooms. */
  tileStates?: Record<string, { state?: SharedRoomTile['state']; label?: string; badge?: number; dot?: boolean; title?: string }>;
  children?: ReactNode;
}) {
  const floorsMap = new Map<string, { room: string; state?: SharedRoomTile['state']; label?: string; badge?: number; dot?: boolean; title?: string }[]>();
  for (const r of rooms) {
    const floor = r.room_number.length > 2 ? r.room_number.slice(0, -2) : '1';
    if (!floorsMap.has(floor)) floorsMap.set(floor, []);
    const s = (tileStates?.[r.room_number] || {}) as { state?: SharedRoomTile['state']; label?: string; badge?: number; dot?: boolean; title?: string };
    floorsMap.get(floor)!.push({ room: r.room_number, ...s });
  }
  const floors = [...floorsMap.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([floor, list]) => ({ floor, rooms: list.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true })) }));

  return (
    <div className="space-y-3">
      {floors.map(g => (
        <div key={g.floor}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Floor {g.floor}</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {g.rooms.map(r => {
              const state = r.state || 'idle';
              const tile = state === 'done' ? { borderColor: '#14b8a6', background: '#14b8a612' }
                : state === 'due' ? { borderColor: '#fb923c', background: '#fff7ed' }
                : state === 'open' ? { borderColor: '#ef4444', background: '#ef444412' }
                : { borderColor: '#e5e7eb', background: '#fff' };
              const color = state === 'done' ? '#14b8a6' : state === 'due' ? '#ea580c' : state === 'open' ? '#ef4444' : '#9ca3af';
              return (
                <button key={r.room} disabled={disabled}
                  onClick={() => onPick?.(r.room)}
                  title={r.title || `Room ${r.room}`}
                  className="relative rounded-xl border px-1 py-2 text-center active:scale-[0.97] transition-transform disabled:opacity-50"
                  style={tile}>
                  <span className="block text-[13px] font-extrabold text-gray-900">{r.room}</span>
                  {r.label !== undefined && (
                    <span className="block text-[8px] font-black uppercase" style={{ color }}>{r.label}</span>
                  )}
                  {r.badge !== undefined && r.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center">{r.badge}</div>
                  )}
                  {r.dot && <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {children}
    </div>
  );
}