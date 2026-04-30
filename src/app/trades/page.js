'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Download } from 'lucide-react';
import { Eye } from 'lucide-react';
import { getAccounts, getTrades } from '@/lib/desktop-api';

export default function Trades() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    getAccounts().then(data => {
      setAccounts(data);
    });
  }, []);

  useEffect(() => {
    getTrades(selectedAccountId).then(data => setTrades(data));
  }, [selectedAccountId]);

  const exportToCSV = () => {
    const headers = ['Date', 'Account', 'Pair', 'Direction', 'Setup', 'Session', 'RRR', 'Status', 'P&L Net'];
    const rows = trades.map(t => [
      t.entry_date.split('T')[0],
      t.account_name || '',
      t.pair,
      t.direction,
      t.setup || '',
      t.session || '',
      t.rr_ratio || '',
      t.status,
      t.pnl_net || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trades_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <div className="flex-row">
          <h2>Trade History</h2>
          <button onClick={exportToCSV} className="btn btn-secondary" style={{ marginLeft: '16px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Pair</th>
              <th>Setup</th>
              <th>Dir</th>
              <th>P&L ($)</th>
              <th>RRR</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '32px'}}>No trades found.</td></tr>
            ) : trades.map(trade => (
              <tr key={trade.id}>
                <td>{new Date(trade.entry_date).toLocaleDateString()}</td>
                <td style={{fontWeight: 'bold', letterSpacing: '1px'}}>{trade.pair}</td>
                <td><span className="badge" style={{background: 'var(--surface-hover)'}}>{trade.setup || '-'}</span></td>
                <td style={{ color: trade.direction === 'long' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                  {trade.direction.toUpperCase()}
                </td>
                <td className={trade.pnl_net > 0 ? 'text-success' : (trade.pnl_net < 0 ? 'text-danger' : '')}>
                  {trade.pnl_net ? `$${trade.pnl_net.toFixed(2)}` : '-'}
                </td>
                <td style={{ fontWeight: 'bold' }}>{trade.rr_ratio ? trade.rr_ratio : '-'}</td>
                <td><span className={`badge ${trade.status}`}>{trade.status}</span></td>
                <td>
                  <Link href={`/trades/detail?id=${trade.id}`} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                    <Eye size={14} /> View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
