import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { getAppDataPath } from './paths';

const appDataDir = getAppDataPath();
const dbPath = path.join(appDataDir, 'journal.db');
const uploadsDir = path.join(appDataDir, 'uploads');

if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let dbInstance = null;

export async function openDB() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'demo', 'challenge', 'personal'
      initial_balance REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL, -- 'long' or 'short'
      entry_price REAL,
      exit_price REAL,
      lot_size REAL,
      pnl_net REAL, -- P&L en dinero ($)
      pnl_percentage REAL, -- P&L en porcentaje (%)
      status TEXT NOT NULL, -- 'open', 'win', 'loss', 'breakeven'
      setup TEXT,
      session TEXT,
      mistake TEXT,
      rr_ratio REAL,
      entry_date DATETIME NOT NULL,
      exit_date DATETIME,
      notes TEXT,
      psychology_score INTEGER CHECK(psychology_score >= 1 AND psychology_score <= 10),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS trade_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      description TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trade_id) REFERENCES trades(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ejecutar Migración Silenciosa: 
  // Convertir rutas antiguas de "/uploads/" a la nueva ruta dinámica "/api/images/"
  try {
    await dbInstance.run(`UPDATE trade_images SET file_path = REPLACE(file_path, '/uploads/', '/api/images/') WHERE file_path LIKE '/uploads/%'`);
    await dbInstance.run(`UPDATE trades SET notes = REPLACE(notes, '/uploads/', '/api/images/') WHERE notes LIKE '%/uploads/%'`);
    await dbInstance.run(`UPDATE study_cases SET content = REPLACE(content, '/uploads/', '/api/images/') WHERE content LIKE '%/uploads/%'`);
    console.log('Migración de rutas de imágenes completada (o no fue necesaria).');
  } catch(e) {
    console.error('Error en migración:', e);
  }

  return dbInstance;
}
