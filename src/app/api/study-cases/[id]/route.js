import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await openDB();
    const studyCase = await db.get('SELECT * FROM study_cases WHERE id = ?', [id]);
    
    if (!studyCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json(studyCase);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { title, content } = await request.json();
    const db = await openDB();
    
    await db.run(
      'UPDATE study_cases SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, id]
    );
    
    const updatedCase = await db.get('SELECT * FROM study_cases WHERE id = ?', [id]);
    return NextResponse.json(updatedCase);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await openDB();
    
    await db.run('DELETE FROM study_cases WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
