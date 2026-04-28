import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { openDB } from '@/lib/db';
import { getAppDataPath } from '@/lib/paths';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const tradeId = formData.get('tradeId');
    const description = formData.get('description') || '';

    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + '_' + file.name.replaceAll(' ', '_');
    const uploadDir = path.join(getAppDataPath(), 'uploads');
    
    await writeFile(path.join(uploadDir, filename), buffer);
    // Return a route that serves the image dynamically
    const filePath = `/api/images/${filename}`;

    const db = await openDB();
    const result = await db.run(
      'INSERT INTO trade_images (trade_id, file_path, description) VALUES (?, ?, ?)',
      [tradeId, filePath, description]
    );

    const newImage = await db.get('SELECT * FROM trade_images WHERE id = ?', [result.lastID]);

    return NextResponse.json({ message: 'Success', image: newImage }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
