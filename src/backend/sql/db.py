import sqlite3
from pathlib import Path


class Database:
    def __init__(self):
        self.connection = sqlite3.connect(Path(__file__).parent / "Database.db")
        self.cursor = self.connection.cursor()
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
                geom_type     TEXT, --'Point' | 'Polygon' | 'MultiPolygon'
                width         REAL,
                height        REAL,
                west          REAL,
                south         REAL,
                east          REAL,
                north         REAL,
                polygon       TEXT,   -- JSON-encoded coordinates
                FOREIGN KEY (eventid) REFERENCES Earthquake(eventid)
                    ON DELETE CASCADE
            );                 
            CREATE INDEX IF NOT EXISTS idx_intensity_eventid ON Intensity(eventid);   
                            '''
        )
        self.connection.commit()