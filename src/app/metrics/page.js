'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Target, ShieldAlert, Activity, BarChart2, Hash, Percent, DollarSign, ArrowDownRight } from 'lucide-react';
import { normalizeSignedPnl, normalizeSignedPnlPct } from '@/lib/trade-math';
import { getAccounts, getTrades } from '@/lib/desktop-api';

export default function Metrics() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  useEffect(() => {
    getAccounts().then(data => {
      setAccounts(data);
    });
    getTrades().then(data => setTrades(data));
  }, []);

  const filteredTrades = selectedAccountId === 'all' 
    ? trades 
    : trades.filter(t => t.account_id.toString() === selectedAccountId);

  // Math Logic for Advanced Metrics
  const calculateMetrics = (tradeList) => {
    let grossWin = 0;
    let grossLoss = 0;
    let wins = 0;
    let losses = 0;
    let totalPnl = 0;
    let totalPnlPercentage = 0;

    // Sort chronologically
    const chronoTrades = [...tradeList].sort((a,b) => new Date(a.entry_date) - new Date(b.entry_date));
    
    let currentStreak = 0;
    let maxLosingStreak = 0;
    
    let peak = 0;
    let maxDrawdownMoney = 0;
    let currentEquityMoney = 0; 

    chronoTrades.forEach(trade => {
      const pnl = normalizeSignedPnl(trade.status, trade.pnl_net);
      const pnlPct = normalizeSignedPnlPct(trade.status, trade.pnl_percentage);

      totalPnl += pnl;
      totalPnlPercentage += pnlPct;

      if (trade.status === 'win') {
        wins++;
        grossWin += pnl;
        currentStreak = 0;
      } else if (trade.status === 'loss') {
        losses++;
        grossLoss += Math.abs(pnl);
        currentStreak++;
        if (currentStreak > maxLosingStreak) {
          maxLosingStreak = currentStreak;
        }
      }

      // Drawdown Math (Absolute Peak to Trough)
      currentEquityMoney += pnl;
      if (currentEquityMoney > peak) {
        peak = currentEquityMoney;
      }
      const drawdown = peak - currentEquityMoney;
      if (drawdown > maxDrawdownMoney) {
        maxDrawdownMoney = drawdown;
      }
    });

    const totalResolved = wins + losses;
    const winRate = totalResolved > 0 ? (wins / totalResolved) : 0;
    const lossRate = totalResolved > 0 ? (losses / totalResolved) : 0;
    const avgWin = wins > 0 ? (grossWin / wins) : 0;
    const avgLoss = losses > 0 ? (grossLoss / losses) : 0;
    
    const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
    
    const profitFactorNum = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : (grossWin / grossLoss);
    const profitFactorStr = profitFactorNum === Infinity ? '∞' : profitFactorNum.toFixed(2);
    
    const rrRatio = avgLoss === 0 ? (avgWin > 0 ? '∞' : '0.00') : (avgWin / avgLoss).toFixed(2);

    return {
      expectancy,
      profitFactorStr,
      profitFactorNum,
      maxDrawdownMoney,
      winRate: (winRate * 100).toFixed(1),
      maxLosingStreak,
      rrRatio,
      totalPnl,
      totalPnlPercentage,
      wins,
      losses,
      avgWin,
      avgLoss,
      totalResolved
    };
  };

  const metrics = calculateMetrics(filteredTrades);

  // Selected Account Initial Balance calculation for Drawdown %
  const currentAccount = accounts.find(a => a.id.toString() === selectedAccountId);
  let maxDrawdownPercentage = null;
  if (currentAccount && metrics.maxDrawdownMoney > 0) {
    maxDrawdownPercentage = ((metrics.maxDrawdownMoney / currentAccount.initial_balance) * 100).toFixed(2);
  } else if (selectedAccountId === 'all') {
    const totalInitialBalance = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
    if (totalInitialBalance > 0) {
      maxDrawdownPercentage = ((metrics.maxDrawdownMoney / totalInitialBalance) * 100).toFixed(2);
    }
  }

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
        <h2>Advanced Metrics</h2>
        <div className="flex-row" style={{ gap: '12px' }}>
          <label style={{ color: 'var(--text-muted)' }}>Filter by Account:</label>
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ width: '250px', background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <option value="all">Global (All Accounts)</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} (${acc.initial_balance})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main P&L Showcase */}
      <div className="form-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(30,30,30,0.8) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '8px' }}>Total Realized P&L</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '24px' }}>
            <h1 style={{ 
              fontSize: '4rem', 
              margin: '0', 
              color: metrics.totalPnl >= 0 ? 'var(--success)' : 'var(--danger)',
              textShadow: metrics.totalPnl >= 0 ? '0 0 40px rgba(16, 185, 129, 0.4)' : '0 0 40px rgba(239, 68, 68, 0.4)'
            }}>
              {metrics.totalPnl >= 0 ? '+' : ''}{metrics.totalPnl.toFixed(2)}$
            </h1>
            <h2 style={{ 
              fontSize: '2rem', 
              margin: '0', 
              color: metrics.totalPnlPercentage >= 0 ? 'var(--success)' : 'var(--danger)',
              opacity: 0.8
            }}>
              ({metrics.totalPnlPercentage >= 0 ? '+' : ''}{metrics.totalPnlPercentage.toFixed(2)}%)
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>Based on {metrics.totalResolved} resolved trades.</p>
        </div>
      </div>

      {/* Advanced Metrics Grid */}
      <div className="form-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--accent)' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Expectancy per Trade</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metrics.expectancy >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {metrics.expectancy >= 0 ? '+' : ''}{metrics.expectancy.toFixed(2)}$
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Expected average return.</div>
          </div>
        </div>

        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '16px', color: '#3b82f6' }}>
            <BarChart2 size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Profit Factor</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metrics.profitFactorNum >= 1.5 ? 'var(--success)' : 'var(--warning)' }}>
              {metrics.profitFactorStr}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Gross Win / Gross Loss.</div>
          </div>
        </div>

        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--danger)' }}>
            <ArrowDownRight size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Max Drawdown</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>
              -${metrics.maxDrawdownMoney.toFixed(2)}
            </div>
            {maxDrawdownPercentage && (
              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px' }}>
                Approx {maxDrawdownPercentage}% of Initial Balance.
              </div>
            )}
          </div>
        </div>

        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--success)' }}>
            <Target size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Win Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {metrics.winRate}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {metrics.wins} Wins / {metrics.losses} Losses
            </div>
          </div>
        </div>

        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--warning)' }}>
            <ShieldAlert size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Max Losing Streak</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--warning)' }}>
              {metrics.maxLosingStreak}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Consecutive losses.</div>
          </div>
        </div>

        <div className="form-card flex-row" style={{ gap: '16px' }}>
          <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '16px', borderRadius: '16px', color: '#ec4899' }}>
            <Activity size={32} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Realized R:R</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              1 : {metrics.rrRatio}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Avg Win: ${metrics.avgWin.toFixed(2)} / Avg Loss: ${metrics.avgLoss.toFixed(2)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
