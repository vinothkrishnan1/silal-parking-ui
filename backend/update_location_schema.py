import pymysql
import os

url = "mysql+pymysql://ipro_admin:1Pr0%40dmin123#%40!@192.168.0.100:3306/vinoth_silal_market_parking"
# Parse URL manually for pymysql
# ipro_admin : 1Pr0@dmin123#@! @ 192.168.0.100 : 3306 / vinoth_silal_market_parking

def apply_migration():
    conn = pymysql.connect(
        host='192.168.0.100',
        user='ipro_admin',
        password='1Pr0@dmin123#@!',
        database='vinoth_silal_market_parking',
        port=3306
    )
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN location_id INT NULL")
        cursor.execute("ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_location FOREIGN KEY (location_id) REFERENCES locations(id)")
        print("Added location_id to vehicles.")
    except Exception as e:
        print("Could not add location_id to vehicles (maybe already exists):", e)
        
    try:
        cursor.execute("ALTER TABLE parking_settings ADD COLUMN location_id INT NULL")
        cursor.execute("ALTER TABLE parking_settings ADD CONSTRAINT fk_ps_location FOREIGN KEY (location_id) REFERENCES locations(id)")
        print("Added location_id to parking_settings.")
    except Exception as e:
        print("Could not add location_id to parking_settings (maybe already exists):", e)
        
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    apply_migration()
