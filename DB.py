import sqlite3

class Database:
    def __init__(self, db_name="prototype_A.db"):
        self.conn = sqlite3.connect(db_name)
        self.cur = self.conn.cursor()
        self.create_table()
    
    def create_table(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT NOT NULL,
                phone INTEGER NOT NULL,
                email TEXT NOT NULL,
                date TEXT NOT NULL,
                startTime INTEGER,
                partySize INTEGER,
                notes TEXT
            )
        """)
        self.conn.commit()

    def add_res(self, customerName, phone, email, date, startTime=None, partySize=None, notes=""):
        self.cur.execute("""
            INSERT INTO reservations (customerName, phone, email, date, startTime, partySize, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (customerName, phone, email, date, startTime, partySize, notes))
        self.conn.commit()

    def get_res(self):
            self.cur.execute("SELECT * FROM reservations")
            return self.cur.fetchall()
    
    def close(self):
         self.conn.close()

# Test case 

if __name__ == "__main__":
    db = Database() 
    db.add_res("Test Person", 1234567890, "test@test.com", "10-01-2025", 1500, 4, "Anniversary Party")
    db.add_res("Test Second Person",3178675309, "testtwo@test.com", "10-02-2025", 1700, 2, "")

    for row in db.get_res():
            print(row)

    db.close()