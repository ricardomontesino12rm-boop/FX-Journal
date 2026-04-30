'use client';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { normalizeSignedPnl, normalizeSignedPnlPct } from '@/lib/trade-math';
import { getAccounts, getTrades } from '@/lib/desktop-api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [trades, setTrades] = useState([]);  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  useEffect(() => {
    getAccounts()
      .then(data => {
        setAccounts(data);
        if (data.length > 0) setSelectedAccountId(data[0].id.toString());
      });
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      getTrades(selectedAccountId).then(data => setTrades(data));
    }
  }, [selectedAccountId]);

  const stats = trades.reduce((acc, trade) => {
    const pnl = normalizeSignedPnl(trade.status, trade.pnl_net);
    const pnlPct = normalizeSignedPnlPct(trade.status, trade.pnl_percentage);

    if (trade.status === 'win') {
      acc.wins += 1;
      acc.pnlNet += pnl;
      acc.pnlPct += pnlPct;
    } else if (trade.status === 'loss') {
      acc.losses += 1;
      acc.pnlNet += pnl;
      acc.pnlPct += pnlPct;
    } else if (trade.status === 'breakeven') {
      acc.breakevens += 1;
      acc.pnlNet += pnl; // E.g., fees
      acc.pnlPct += pnlPct;
    } else if (trade.status === 'open') {
      acc.open += 1;
    }
    acc.total += 1;
    return acc;
  }, { wins: 0, losses: 0, breakevens: 0, open: 0, total: 0, pnlNet: 0, pnlPct: 0 });

  // Winrate should only consider resolved trades (wins and losses). Breakevens/Open don't penalize winrate.
  const resolvedTrades = stats.wins + stats.losses;
  const winrate = resolvedTrades > 0 ? ((stats.wins / resolvedTrades) * 100).toFixed(1) : 0;
  
  // Advanced Metrics
  // Calculate Profit Factor strictly based on status to avoid user input errors
  const grossWin = trades.filter(t => t.status === 'win').reduce((sum, t) => sum + Math.abs(t.pnl_net || 0), 0);
  const grossLoss = trades.filter(t => t.status === 'loss').reduce((sum, t) => sum + Math.abs(t.pnl_net || 0), 0);
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? '∞' : '0.00') : (grossWin / grossLoss).toFixed(2);
  
  const tradesWithRRR = trades.filter(t => t.rr_ratio !== null);
  const avgRRR = tradesWithRRR.length > 0 
    ? (tradesWithRRR.reduce((sum, t) => sum + t.rr_ratio, 0) / tradesWithRRR.length).toFixed(2) 
    : '-';

  // Setup Analytics
  const setupStats = trades.reduce((acc, t) => {
    if (!t.setup) return acc;
    if (!acc[t.setup]) acc[t.setup] = { count: 0, wins: 0, pnl: 0 };
    acc[t.setup].count++;
    
    const pnl = normalizeSignedPnl(t.status, t.pnl_net);

    if (t.status === 'win') acc[t.setup].wins++;
    acc[t.setup].pnl += pnl;
    return acc;
  }, {});
  
  const bestSetup = Object.entries(setupStats).sort((a,b) => b[1].pnl - a[1].pnl)[0];

  // Equity Curve Data
  const currentAccount = accounts.find(a => a.id.toString() === selectedAccountId);
  const initialBalance = currentAccount ? currentAccount.initial_balance : 0;
  
  let currentEquity = initialBalance;
  const equityData = [initialBalance];
  const labels = ['Start'];
  
  // Trades come from API ordered by entry_date DESC. We need ASC for chart.
  const chronologicalTrades = [...trades].reverse();
  chronologicalTrades.forEach(t => {
    const pnl = normalizeSignedPnl(t.status, t.pnl_net);
    
    currentEquity += pnl;
    equityData.push(currentEquity);
    labels.push(new Date(t.entry_date).toLocaleDateString());
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Equity Curve ($)',
        data: equityData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#e2e8f0' } },
      title: { display: true, text: `Account Growth (Start: $${initialBalance})`, color: '#e2e8f0' }
    },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div>
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2>Dashboard</h2>
        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)}
          style={{ width: '200px' }}
        >
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
          ))}
        </select>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <p>No accounts found. Please create an account first.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <label>Net P&L</label>
              <div className={`stat-value ${stats.pnlNet >= 0 ? 'text-success' : 'text-danger'}`}>
                ${stats.pnlNet.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', color: stats.pnlPct >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '4px' }}>
                {stats.pnlPct >= 0 ? '+' : ''}{stats.pnlPct.toFixed(2)}%
              </div>
            </div>
            <div className="glass-panel stat-card">
              <label>Profit Factor</label>
              <div className={`stat-value ${profitFactor >= 1.5 ? 'text-success' : 'text-warning'}`}>
                {profitFactor}
              </div>
            </div>
            <div className="glass-panel stat-card">
              <label>Winrate</label>
              <div className="stat-value">{winrate}%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats.wins}W - {stats.losses}L - {stats.breakevens}BE
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '32px' }}>
            <div className="glass-panel">
              <Line options={chartOptions} data={chartData} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel">
                <label>Avg RRR</label>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0' }}>
                  {avgRRR}
                </div>
              </div>
              <div className="glass-panel">
                <label>Best Setup</label>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0' }}>
                  {bestSetup ? bestSetup[0] : 'Not enough data'}
                </div>
                {bestSetup && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                    +${bestSetup[1].pnl.toFixed(2)} ({bestSetup[1].wins}/{bestSetup[1].count} wins)
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
