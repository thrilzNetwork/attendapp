#!/usr/bin/env python3
"""Bootstrap BW FTL 10272 data into Attenda Supabase DB.
Run: python3 -m pip install supabase-py && python3 bootstrap.py
"""
import os, sys, json

SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co'
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
if not SERVICE_KEY:
    print("ERROR: Set SUPABASE_SERVICE_KEY env var")
    print("Run: vercel env pull .env.local, read the key, then export it")
    sys.exit(1)

from supabase import create_client
admin = create_client(SUPABASE_URL, SERVICE_KEY)

# 1. Create hotel
hotel_data = {
    'slug': 'bw-ftl-10272',
    'name': 'Best Western Fort Lauderdale Airport',
    'address': '1700 W Commercial Blvd, Fort Lauderdale, FL 33309',
    'admin_phone': '+19547603100',
    'room_count': 103,
    'notification_email': 'gm@bwftl10272.com',
}
hotel = admin.table('hotels').insert(hotel_data).execute()
hotel_id = hotel.data[0]['id']
print(f"✅ Created hotel: {hotel_id}")

# 2. Create staff
staff_data = [
    {'hotel_id': hotel_id, 'name': 'Alejandro Soria', 'role': 'general_manager',
     'pin_code': '1111', 'permissions': ['orders', 'messages', 'shuttle', 'staff_management', 'checklists', 'schedules', 'reports'], 'active': True},
    {'hotel_id': hotel_id, 'name': 'Front Desk Agent', 'role': 'front_desk',
     'pin_code': '2222', 'permissions': ['orders', 'messages', 'shuttle'], 'active': True},
    {'hotel_id': hotel_id, 'name': 'Housekeeping', 'role': 'housekeeping',
     'pin_code': '3333', 'permissions': ['orders'], 'active': True},
]
for s in staff_data:
    staff = admin.table('staff_accounts').insert(s).execute()
    print(f"✅ Created staff: {staff.data[0]['name']} (PIN: {s['pin_code']})")

# 3. Create shuttle routes
routes = [
    {'hotel_id': hotel_id, 'name': 'FLL Airport Shuttle (To Hotel)', 'type': 'airport',
     'direction': 'to_hotel', 'pickup_location': 'FLL Airport - Arrivals Level',
     'dropoff_location': 'BW FTL Airport - Lobby',
     'schedule': [{'time': f'{h:02d}:00', 'days': ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} for h in range(6, 23, 2)],
     'is_active': True},
    {'hotel_id': hotel_id, 'name': 'FLL Airport Shuttle (To Airport)', 'type': 'airport',
     'direction': 'to_airport', 'pickup_location': 'BW FTL Airport - Lobby',
     'dropoff_location': 'FLL Airport - Departures',
     'schedule': [{'time': f'{h:02d}:00', 'days': ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} for h in range(5, 22, 2)],
     'is_active': True},
    {'hotel_id': hotel_id, 'name': 'Port Everglades Cruise Shuttle', 'type': 'cruise',
     'direction': 'to_port', 'pickup_location': 'BW FTL Airport - Lobby',
     'dropoff_location': 'Port Everglades - Terminal',
     'schedule': [{'time': t, 'days': ['Sat', 'Sun']} for t in ['09:00', '11:00', '13:00']],
     'is_active': True},
]
for r in routes:
    route = admin.table('shuttle_routes').insert(r).execute()
    print(f"✅ Created route: {route.data[0]['name']}")

print("\n🎉 Bootstrap complete!")
print(f"Hotel slug: bw-ftl-10272")
print(f"GM PIN: 1111")
print(f"Front Desk PIN: 2222")
print(f"Housekeeping PIN: 3333")