import pymysql

def create_db():
    connection = pymysql.connect(
        host='192.168.0.100',
        user='ipro_admin',
        password='1Pr0@dmin123#@!',
        port=3306
    )
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS vinoth_silal_market_parking;")
    print("Database vinoth_silal_market_parking created successfully.")

if __name__ == "__main__":
    create_db()
