import { describe, expect, it } from 'vitest';
import { resolveHotelScope, type Caller } from './supabase-admin';

const staff: Caller = { userId: 'u1', email: 's@a.com', hotelId: 'hotel-A', isSuper: false };
const superadmin: Caller = { userId: 'u2', email: 'admin@a.com', hotelId: null, isSuper: true };
const orphanStaff: Caller = { userId: 'u3', email: 'x@a.com', hotelId: null, isSuper: false };

describe('resolveHotelScope', () => {
  it('pins staff to their own hotel and ignores a requested hotel', () => {
    expect(resolveHotelScope(staff, 'hotel-B')).toBe('hotel-A');
    expect(resolveHotelScope(staff, undefined)).toBe('hotel-A');
  });

  it('lets a superadmin act on the hotel they request', () => {
    expect(resolveHotelScope(superadmin, 'hotel-B')).toBe('hotel-B');
  });

  it('returns null for a superadmin with no requested hotel', () => {
    expect(resolveHotelScope(superadmin, undefined)).toBeNull();
  });

  it('returns null for a staff member with no hotel', () => {
    expect(resolveHotelScope(orphanStaff, 'hotel-B')).toBeNull();
  });
});
