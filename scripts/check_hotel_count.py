import os, sys
from supabase import create_client

supabase = create_client(
    'https://bdmmstatrsenidlgjock.supabase.co',
    os.environ['SUPABASE_SERVICE_KEY']
)

# Check FTL hotel room_count
data = supabase.table('hotels').select('id,slug,name,room_count').ilike('slug','%ftl%').execute()
print("FTL hotels:", data.data)

# Check the actual hotel config
hotel_id = 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca'
data2 = supabase.table('hotels').select('id,slug,name,room_count').eq('id', hotel_id).execute()
print(f"\nHotel {hotel_id}:", data2.data)