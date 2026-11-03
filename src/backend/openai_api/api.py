import sqlite3
import logging

log = logging.getLogger(__name__)

def save_api(api: str, key: str, provider: str, database):
    database.cursor.execute('''INSERT OR REPLACE INTO API (key, api) VALUES (? ?)''', (key, api))
    saved = f"{api} : {key}"
    log.info("[Backend Database] Saved %s", saved)
    database.connection.commit()