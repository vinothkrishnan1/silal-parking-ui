import pymysql

url = "mysql+pymysql://ipro_admin:1Pr0%40dmin123#%40!@192.168.0.100:3306/vinoth_silal_market_parking"

def apply_fk_updates():
    conn = pymysql.connect(
        host='192.168.0.100',
        user='ipro_admin',
        password='1Pr0@dmin123#@!',
        database='vinoth_silal_market_parking',
        port=3306
    )
    cursor = conn.cursor()
    
    try:
        # Get foreign keys for vehicles table
        cursor.execute("""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'vinoth_silal_market_parking' 
              AND TABLE_NAME = 'vehicles' 
              AND REFERENCED_TABLE_NAME = 'locations';
        """)
        fks = cursor.fetchall()
        for fk in fks:
            fk_name = fk[0]
            print(f"Dropping FK {fk_name} from vehicles...")
            cursor.execute(f"ALTER TABLE vehicles DROP FOREIGN KEY {fk_name}")
            
        print("Adding new FK with SET NULL to vehicles...")
        cursor.execute("ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL")
        
        # Get foreign keys for parking_settings table
        cursor.execute("""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'vinoth_silal_market_parking' 
              AND TABLE_NAME = 'parking_settings' 
              AND REFERENCED_TABLE_NAME = 'locations';
        """)
        fks = cursor.fetchall()
        for fk in fks:
            fk_name = fk[0]
            print(f"Dropping FK {fk_name} from parking_settings...")
            cursor.execute(f"ALTER TABLE parking_settings DROP FOREIGN KEY {fk_name}")
            
        print("Adding new FK with CASCADE to parking_settings...")
        cursor.execute("ALTER TABLE parking_settings ADD CONSTRAINT fk_ps_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE")
        
        conn.commit()
        print("Foreign keys updated successfully.")
    except Exception as e:
        print("Error:", e)
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    apply_fk_updates()
