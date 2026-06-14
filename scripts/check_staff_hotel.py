#!/usr/bin/env python3
import os, json, subprocess

# Read service key from env
with open('/Users/thrilzco/projects/attenda/.env.local') as f:
    for line in f:
        line = line.strip()
        if line.startswith('SUPABASE_SERVICE_KEY='):
            key = line.split('=', 1)[1].strip().strip("'").strip('"')
            os.environ['SUPABASE_SERVICE_KEY'] = key
            break

key = os.environ.get('SUPABASE_SERVICE_KEY', '')

# Rest API calls
import urllib.request

def supabase_get(table, query=''):
    url = f'https://bdmmstatrsenidlgjock.supabase.co/rest/v1/{table}?{query}'
    req = urllib.request.Request(url, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# All staff
staff = supabase_get('staff', 'select=id,name,email,hotel_id,role,active')
print("=== ALL STAFF ===")
for s in staff:
    print(f"  {s['name']:25s} email={str(s.get('email','')):35s} hotel={s['hotel_id'][:8]}... active={s.get('active')} role={s.get('role')}")

# Check hotel names
h1 = supabase_get('hotels', 'select=id,slug,name,room_count&id=eq.f1f8de36-3126-4ba8-9cc6-b11cefb276ca')
h2 = supabase_get('hotels', 'select=id,slug,name,room_count&id=eq.7feb88fa-a72c-4c5d-b094-b4948bdab1d7')
print("\n=== HOTELS ===")
print(f"  bw-ftl-10272:   {h1}")
print(f"  cruise-port:    {h2}")

# Which hotel does thrilzmedia staff belong to?
for s in staff:
    if 'thrilzmedia' in str(s.get('email','')):
        hid = s['hotel_id']
        if hid == 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca':
            print(f"\n>>> thrilzmedia is on bw-ftl-10272 (room_count=103, WRONG)")
        elif hid == '7feb88fa-a72c-4c5d-b094-b4948bdab1d7':
            print(f"\n>>> thrilzmedia is on cruise-port (room_count=54, CORRECT)")
        else:
            print(f"\n>>> thrilzmedia is on unknown hotel {hid}")