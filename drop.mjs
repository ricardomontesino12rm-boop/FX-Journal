import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function drop() {
  const db = await open({
    filename: './data/journal.db',
    driver: sqlite3.Database
  });
  await db.exec('DROP TABLE IF EXISTS trades; DROP TABLE IF EXISTS accounts;');
  console.log('Tables dropped');
}
drop();
