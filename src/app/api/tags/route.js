import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await openDB();
    
    // Fetch unique historical tags
    const sessions = await db.all('SELECT DISTINCT session as value FROM trades WHERE session IS NOT NULL AND session != ""');
    const setups = await db.all('SELECT DISTINCT setup as value FROM trades WHERE setup IS NOT NULL AND setup != ""');
    const mistakes = await db.all('SELECT DISTINCT mistake as value FROM trades WHERE mistake IS NOT NULL AND mistake != ""');
    
    const mapToOptions = (rows) => rows.map(r => ({ value: r.value, label: r.value }));
    
    return NextResponse.json({
      sessions: mapToOptions(sessions),
      setups: mapToOptions(setups),
      mistakes: mapToOptions(mistakes)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
