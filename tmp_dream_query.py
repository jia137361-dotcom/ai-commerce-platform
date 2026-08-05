import sqlite3
import json
import time

DB = r"C:\Users\sherlock\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Phase 1: List recent sessions for this project (last 7 days)
seven_days_ago = int(time.time() * 1000) - (7 * 24 * 3600 * 1000)
print("=== RECENT SESSIONS (last 7 days) ===")
cur.execute("""
    SELECT id, directory, title, time_created
    FROM session 
    WHERE directory LIKE '%ai-commerce-platform%'
    ORDER BY time_created DESC 
    LIMIT 20
""")
for row in cur.fetchall():
    tc = row['time_created']
    if tc:
        import datetime
        dt = datetime.datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M')
    else:
        dt = '(unknown)'
    print(f"  {row['id'][:12]}... | {dt} | {row['title'] or '(no title)'}")

# Phase 2: Search user messages for rule/decision keywords
print("\n=== USER STATEMENTS WITH RULE/DECISION KEYWORDS ===")
keywords = ["always", "never", "remember", "rule", "decision", "decided", "tradeoff", "repeat", "every time", "workflow"]
for kw in keywords:
    cur.execute("""
        SELECT m.session_id, m.time_created, json_extract(m.data, '$.content') as content
        FROM message m
        JOIN session s ON s.id = m.session_id
        WHERE s.directory LIKE '%ai-commerce-platform%'
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(m.data, '$.content') LIKE ?
        ORDER BY m.time_created DESC
        LIMIT 5
    """, (f"%{kw}%",))
    rows = cur.fetchall()
    if rows:
        print(f"\n  Keyword: '{kw}' ({len(rows)} hits)")
        for r in rows:
            tc = r['time_created']
            dt = datetime.datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M') if tc else '?'
            content = (r['content'] or '')[:250]
            print(f"    [{dt}] {content}")

# Phase 3: Check for repeated file write patterns
print("\n=== FREQUENTLY WRITTEN FILES ===")
cur.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.input.file_path') as fp,
           COUNT(*) as cnt
    FROM message m
    JOIN part p ON p.message_id = m.id
    JOIN session s ON s.id = m.session_id
    WHERE s.directory LIKE '%ai-commerce-platform%'
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.tool') IN ('write', 'edit', 'Write', 'Edit')
    GROUP BY json_extract(p.data, '$.state.input.file_path')
    HAVING cnt > 2
    ORDER BY cnt DESC
    LIMIT 20
""")
for row in cur.fetchall():
    print(f"  [{row['cnt']}x] {row['tool']}: {row['fp'] or '(unknown)'}")

# Phase 4: Search for error patterns
print("\n=== RECENT ERROR PATTERNS ===")
cur.execute("""
    SELECT m.session_id, m.time_created, 
           json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.output') as output
    FROM message m
    JOIN part p ON p.message_id = m.id
    JOIN session s ON s.id = m.session_id
    WHERE s.directory LIKE '%ai-commerce-platform%'
      AND json_extract(p.data, '$.type') = 'tool'
      AND (
        json_extract(p.data, '$.state.output') LIKE '%error%'
        OR json_extract(p.data, '$.state.output') LIKE '%Error%'
        OR json_extract(p.data, '$.state.output') LIKE '%failed%'
      )
    ORDER BY m.time_created DESC
    LIMIT 15
""")
for row in cur.fetchall():
    tc = row['time_created']
    dt = datetime.datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M') if tc else '?'
    output = (row['output'] or '')[:300]
    print(f"  [{dt}] tool={row['tool']}")
    print(f"    {output}")

conn.close()
print("\n=== DONE ===")
