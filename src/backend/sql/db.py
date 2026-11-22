import sqlite3
from pathlib import Path
class Database:
    def __init__(self):
        self.connection = sqlite3.connect(Path(__file__).parent / "Database.db", check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
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
    
        CREATE TABLE IF NOT EXISTS Typhoon (
            eventid        TEXT PRIMARY KEY,
            description    TEXT,
            severity       REAL,
            severitytext   TEXT,
            alertlevel     TEXT,
            initialdate    TEXT,
            enddate        TEXT,
            center_lon     REAL,
            center_lat     REAL,
            position_lon   REAL,   -- latest track position, [lon, lat]
            position_lat   REAL,
            radius_km      REAL,   -- outermost (60 km/h) wind radius
            west           REAL,
            south          REAL,
            east           REAL,
            north          REAL,
            hull           TEXT,   -- JSON-encoded green wind polygon
            wind_timestamp TEXT    -- advisory the wind field came from
            );

        CREATE TABLE IF NOT EXISTS WindField (
            windfield_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            eventid       TEXT NOT NULL,
            intensity     REAL,    -- wind threshold in km/h (60, 90, 120)
            radius_km     REAL,
            width         REAL,
            height        REAL,
            west          REAL,
            south         REAL,
            east          REAL,
            north         REAL,
            hull          TEXT,    -- JSON-encoded coordinates
            FOREIGN KEY (eventid) REFERENCES Typhoon(eventid)
                ON DELETE CASCADE
            );

        CREATE TABLE IF NOT EXISTS API (
            api TEXT NOT NULL PRIMARY KEY,
            key TEXT NOT NULL
            );
    
        CREATE INDEX IF NOT EXISTS idx_intensity_eventid ON Intensity(eventid);
        CREATE INDEX IF NOT EXISTS idx_windfield_eventid ON WindField(eventid);

        CREATE TABLE IF NOT EXISTS TrackPoint (
            track_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            eventid   TEXT NOT NULL,
            ordinal   INTEGER NOT NULL,   -- order along the track, oldest first
            longitude REAL NOT NULL,
            latitude  REAL NOT NULL,
            timestamp TEXT,
            FOREIGN KEY (eventid) REFERENCES Typhoon(eventid)
                ON DELETE CASCADE
            );

        CREATE INDEX IF NOT EXISTS idx_trackpoint_eventid ON TrackPoint(eventid);
        
        CREATE TABLE IF NOT EXISTS Shelters (
            id INTEGER PRIMARY KEY,        -- OSM element id
            name TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            type TEXT,
            address TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_shelters_lat_lon ON shelters(lat, lon);

        CREATE TABLE IF NOT EXISTS Users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT NOT NULL UNIQUE,
            password    TEXT NOT NULL,
            api         TEXT NOT NULL DEFAULT '',
            api_key     TEXT NOT NULL DEFAULT '',
            search_key  TEXT NOT NULL DEFAULT ''
        );
                            '''
        )
        self.connection.commit()
        
    def check_db(self):
        self.cursor.execute("SELECT * FROM Typhoon")
        rows = self.cursor.fetchall()
        for row in rows:
            for key in row.keys():
                print(f"{key} : {row[key]}")
        
        
if "__main__" == __name__:
    
    sql = Database()
    sql.check_db()