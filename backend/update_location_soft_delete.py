import pymysql

def update_locations():
    conn = pymysql.connect(
        host='192.168.0.100',
        user='ipro_admin',
        password='1Pr0@dmin123#@!',
        database='vinoth_silal_market_parking',
        port=3306
    )
    cursor = conn.cursor()
    
    try:
        print("Adding is_active column to locations...")
        cursor.execute("ALTER TABLE locations ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print("Error:", e)
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    update_locations()
