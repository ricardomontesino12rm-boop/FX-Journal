import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const db = await openDB();
    const trade = await db.get('SELECT t.*, a.name as account_name FROM trades t JOIN accounts a ON t.account_id = a.id WHERE t.id = ?', [params.id]);
    
    if (!trade) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(trade);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { 
      account_id, pair, direction, pnl_net, pnl_percentage, status, setup, session, mistake, rr_ratio, 
      entry_date, exit_date, notes, psychology_score 
    } = body;
    
    const db = await openDB();

    // Recalculate % if needed
    let finalPnlPercentage = pnl_percentage;
    if (pnl_net !== null && pnl_net !== undefined && (pnl_percentage === null || pnl_percentage === undefined || isNaN(pnl_percentage))) {
      const account = await db.get('SELECT initial_balance FROM accounts WHERE id = ?', [account_id]);
      if (account) {
        const history = await db.get('SELECT SUM(pnl_net) as total_pnl FROM trades WHERE account_id = ? AND id != ? AND pnl_net IS NOT NULL', [account_id, params.id]);
        const currentBalance = account.initial_balance + (history.total_pnl || 0);
        if (currentBalance > 0) {
          finalPnlPercentage = (pnl_net / currentBalance) * 100;
        }
      }
    }

    await db.run(
      `UPDATE trades SET 
        account_id = ?, pair = ?, direction = ?, pnl_net = ?, pnl_percentage = ?, 
        status = ?, setup = ?, session = ?, mistake = ?, rr_ratio = ?, 
        entry_date = ?, exit_date = ?, notes = ?, psychology_score = ?
      WHERE id = ?`,
      [
        account_id, pair, direction, pnl_net !== undefined ? pnl_net : null, 
        finalPnlPercentage !== undefined ? finalPnlPercentage : null, 
        status, setup || null, session || null, mistake || null, rr_ratio !== undefined ? rr_ratio : null,
        entry_date, exit_date || null, notes || '', psychology_score, params.id
      ]
    );
    
    const updatedTrade = await db.get('SELECT * FROM trades WHERE id = ?', [params.id]);
    return NextResponse.json(updatedTrade);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const db = await openDB();
    
    // Also delete associated images from DB if needed (cascade should handle, but just in case)
    await db.run('DELETE FROM trade_images WHERE trade_id = ?', [params.id]);
    await db.run('DELETE FROM trades WHERE id = ?', [params.id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
