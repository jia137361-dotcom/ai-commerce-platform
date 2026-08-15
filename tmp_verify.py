import sqlite3
import json

DB = r"C:\Users\sherlock\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Verify: Ship from/Ship to session user statements
print("=== VERIFY: Ship from / Ship to user statements ===")
cur.execute("""
    SELECT m.time_created, json_extract(m.data, '$.content') as content
    FROM message m
    JOIN session s ON s.id = m.session_id
    WHERE s.id = 'ses_08be2cf19ffe6b6blxMfHjEWXV'
      AND json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created
""")
for r in cur.fetchall():
    import datetime
    dt = datetime.datetime.fromtimestamp(r['time_created'] / 1000).strftime('%Y-%m-%d %H:%M')
    print(f"  [{dt}] {(r['content'] or '')[:300]}")

# Verify: Server deployment session user statements  
print("\n=== VERIFY: Server deployment user statements ===")
cur.execute("""
    SELECT m.time_created, json_extract(m.data, '$.content') as content
    FROM message m
    JOIN session s ON s.id = m.session_id
    WHERE s.id = 'ses_0afd25407ffekuAkjjdUw3Gtt0'
      AND json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created
""")
for r in cur.fetchall():
    dt = datetime.datetime.fromtimestamp(r['time_created'] / 1000).strftime('%Y-%m-%d %H:%M')
    print(f"  [{dt}] {(r['content'] or '')[:300]}")

# Verify: Check all non-checkpoint sessions with titles
print("\n=== ALL SESSIONS WITH TITLES (not checkpoint-writer) ===")
cur.execute("""
    SELECT id, title, time_created
    FROM session 
    WHERE directory LIKE '%ai-commerce-platform%'
      AND title NOT LIKE '%checkpoint-writer%'
      AND title IS NOT NULL
      AND title != ''
    ORDER BY time_created DESC
    LIMIT 30
""")
for r in cur.fetchall():
    dt = datetime.datetime.fromtimestamp(r['time_created'] / 1000).strftime('%Y-%m-%d %H:%M')
    print(f"  {r['id'][:16]}... | {dt} | {r['title']}")

conn.close()
