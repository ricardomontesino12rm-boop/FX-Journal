import { unlink } from 'fs/promises';
import path from 'path';
import { getAppDataPath } from '@/lib/paths';

function extractImagePathsFromHtml(html) {
  if (!html || typeof html !== 'string') return [];
  const matches = html.match(/\/api\/images\/[A-Za-z0-9._-]+/g);
  return matches || [];
}

function toDiskPath(filePath) {
  const filename = filePath.split('/').pop();
  if (!filename) return null;
  return path.join(getAppDataPath(), 'uploads', filename);
}

async function deleteDiskFile(filePath) {
  const diskPath = toDiskPath(filePath);
  if (!diskPath) return;
  try {
    await unlink(diskPath);
  } catch (error) {
    // Ignore missing files and continue cleanup.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function deleteImagesForTradeIds(db, tradeIds) {
  if (!Array.isArray(tradeIds) || tradeIds.length === 0) return;

  const placeholders = tradeIds.map(() => '?').join(', ');
  const linkedImages = await db.all(
    `SELECT file_path FROM trade_images WHERE trade_id IN (${placeholders})`,
    tradeIds
  );
  const notesRows = await db.all(
    `SELECT notes FROM trades WHERE id IN (${placeholders})`,
    tradeIds
  );

  const pathsToDelete = new Set(linkedImages.map((row) => row.file_path).filter(Boolean));
  for (const row of notesRows) {
    for (const noteImagePath of extractImagePathsFromHtml(row.notes)) {
      pathsToDelete.add(noteImagePath);
    }
  }

  for (const filePath of pathsToDelete) {
    await deleteDiskFile(filePath);
  }

  await db.run(`DELETE FROM trade_images WHERE trade_id IN (${placeholders})`, tradeIds);
}
