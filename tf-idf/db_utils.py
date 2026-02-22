import os
import sqlite3

# Use an absolute path relative to this file so scripts run from different CWD still find the DB
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'articora.db'))

def get_db():
    return sqlite3.connect(DB_PATH)