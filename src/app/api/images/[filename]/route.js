import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getAppDataPath } from '@/lib/paths';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    const filePath = path.join(getAppDataPath(), 'uploads', filename);
    
    const buffer = await readFile(filePath);
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.webp') contentType = 'image/webp';
    if (ext === '.gif') contentType = 'image/gif';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    return new NextResponse('Image not found', { status: 404 });
  }
}
