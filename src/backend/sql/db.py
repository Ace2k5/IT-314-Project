import sqlite3
from pathlib import Path


class Database:
    def __init__(self):
        self.connection = sqlite3.connect(Path(__file__).parent / "Database.db", check_same_thread=False)
        self.cursor = self.connection.cursor()
        self.connection.row_factory = sqlite3.Row
        self._init_db()
    
    def _init_db(self):
        self.cursor.execute('PRAGMA foreign_keys = ON;')
        self.cursor.executescript('''
        CREATE TABLE IF NOT EXISTS Earthquake (
                eventid       TEXT PRIMARY KEY,
                description   TEXT,
                severity      INTEGER,
                severitytext  TEXT,
                alertlevel    TEXT,
                initialdate   TEXT,
                enddate       TEXT
            );

            CREATE TABLE IF NOT EXISTS Intensity (
                intensity_id  INTEGER PRIMARY KEY AUTOINCREMENT,
                eventid       TEXT NOT NULL,
                intensity     REAL,
                width         REAL,
                height        REAL,
                west          REAL,
                south         REAL,
                east          REAL,
                north         REAL,
                hull          TEXT,   -- JSON-encoded coordinates
                FOREIGN KEY (eventid) REFERENCES Earthquake(eventid)
                    ON DELETE CASCADE
            );                 
            CREATE INDEX IF NOT EXISTS idx_intensity_eventid ON Intensity(eventid);   
                            '''
        )
        self.connection.commit()
        
    def test_db(self):
        self.cursor.execute("SELECT * FROM Earthquake")
        print(self.cursor.fetchall())
        
        
if "__main__" == __name__:
    sql = Database()
    sql.test_db()