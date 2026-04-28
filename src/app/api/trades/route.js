import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  try {
    const db = await openDB();
    let query = `
      SELECT t.*, a.name as account_name 
      FROM trades t 
      JOIN accounts a ON t.account_id = a.id
    `;
    const params = [];

    if (accountId) {
      query += ' WHERE t.account_id = ?';
      params.push(accountId);
    }
    
    query += ' ORDER BY t.entry_date DESC';
    
    const trades = await db.all(query, params);
    return NextResponse.json(trades);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      account_id, pair, direction, entry_price, exit_price, lot_size, 
      pnl_net, pnl_percentage, status, setup, session, mistake, rr_ratio, 
      entry_date, exit_date, notes, psychology_score 
    } = body;
    
    const db = await openDB();

    // Calculate P&L % dynamically if not provided but P&L $ is provided
    let finalPnlPercentage = pnl_percentage;
    if (pnl_net !== null && pnl_net !== undefined && (pnl_percentage === null || pnl_percentage === undefined || isNaN(pnl_percentage))) {
      const account = await db.get('SELECT initial_balance FROM accounts WHERE id = ?', [account_id]);
      if (account) {
        const history = await db.get('SELECT SUM(pnl_net) as total_pnl FROM trades WHERE account_id = ? AND pnl_net IS NOT NULL', [account_id]);
        const currentBalance = account.initial_balance + (history.total_pnl || 0);
        if (currentBalance > 0) {
          finalPnlPercentage = (pnl_net / currentBalance) * 100;
        }
      }
    }

    const result = await db.run(
      `INSERT INTO trades (
        account_id, pair, direction, entry_price, exit_price, lot_size, 
        pnl_net, pnl_percentage, status, setup, session, mistake, rr_ratio, 
        entry_date, exit_date, notes, psychology_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account_id, pair, direction, entry_price || null, exit_price || null, lot_size || null, 
        pnl_net !== undefined ? pnl_net : null, 
        finalPnlPercentage !== undefined ? finalPnlPercentage : null, 
        status, setup || null, session || null, mistake || null, rr_ratio !== undefined ? rr_ratio : null,
        entry_date, exit_date || null, notes || '', psychology_score
      ]
    );
    
    const newTrade = await db.get('SELECT * FROM trades WHERE id = ?', [result.lastID]);
    return NextResponse.json(newTrade, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
