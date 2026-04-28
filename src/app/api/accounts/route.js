import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await openDB();
    const accounts = await db.all('SELECT * FROM accounts ORDER BY created_at DESC');
    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, type, initial_balance } = await request.json();
    const db = await openDB();
    const result = await db.run(
      'INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)',
      [name, type, initial_balance]
    );
    const newAccount = await db.get('SELECT * FROM accounts WHERE id = ?', [result.lastID]);
    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
