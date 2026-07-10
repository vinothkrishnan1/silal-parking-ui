import sqlite3
import os

# Database path
db_path = 'parking.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# V3 Columns
try:
    cursor.execute("ALTER TABLE parking_settings ADD COLUMN visitor_reserved INTEGER DEFAULT 0")
    print("Added visitor_reserved column")
except sqlite3.OperationalError:
    print("visitor_reserved column already exists")

try:
    cursor.execute("ALTER TABLE parking_settings ADD COLUMN tenant_reserved INTEGER DEFAULT 0")
    print("Added tenant_reserved column")
except sqlite3.OperationalError:
    print("tenant_reserved column already exists")

# V4 Columns
try:
    cursor.execute("ALTER TABLE parking_settings ADD COLUMN visitor_occupied_override INTEGER DEFAULT NULL")
    print("Added visitor_occupied_override column")
except sqlite3.OperationalError:
    print("visitor_occupied_override column already exists")

try:
    cursor.execute("ALTER TABLE parking_settings ADD COLUMN tenant_occupied_override INTEGER DEFAULT NULL")
    print("Added tenant_occupied_override column")
except sqlite3.OperationalError:
    print("tenant_occupied_override column already exists")

conn.commit()
conn.close()
print("Migration completed successfully")
