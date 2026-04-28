import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await openDB();
    const cases = await db.all('SELECT id, title, created_at, updated_at FROM study_cases ORDER BY updated_at DESC');
    return NextResponse.json(cases);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, content } = await request.json();
    const db = await openDB();
    const result = await db.run(
      'INSERT INTO study_cases (title, content) VALUES (?, ?)',
      [title || 'Untitled Case', content || '']
    );
    const newCase = await db.get('SELECT * FROM study_cases WHERE id = ?', [result.lastID]);
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
