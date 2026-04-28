import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, type, initial_balance } = await request.json();
    const db = await openDB();
    
    await db.run(
      'UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?',
      [name, type, initial_balance, id]
    );
    
    const updatedAccount = await db.get('SELECT * FROM accounts WHERE id = ?', [id]);
    return NextResponse.json(updatedAccount);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await openDB();
    
    // Cascading delete: first delete all trades associated with this account
    // This assumes trade_images cascade delete is handled by SQLite ON DELETE CASCADE 
    // or we can manually delete images too, but the DB schema has ON DELETE CASCADE for trade_images.
    await db.run('DELETE FROM trades WHERE account_id = ?', [id]);
    
    // Now delete the account
    await db.run('DELETE FROM accounts WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
