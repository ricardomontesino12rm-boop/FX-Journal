'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, Target, Plus } from 'lucide-react';

export default function Calendar() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    fetch('/api/trades')
      .then(res => res.json())
      .then(data => setTrades(data));
  }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const tradesByDate = trades.reduce((acc, trade) => {
    const dateStr = trade.entry_date.split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = { count: 0, pnl: 0, wins: 0, losses: 0 };
    acc[dateStr].count += 1;
    
    // Anti-error PNL logic
    let pnl = trade.pnl_net || 0;
    if (trade.status === 'loss') pnl = -Math.abs(pnl);
    if (trade.status === 'win') pnl = Math.abs(pnl);
    
    acc[dateStr].pnl += pnl;
    if (trade.status === 'win') acc[dateStr].wins += 1;
    if (trade.status === 'loss') acc[dateStr].losses += 1;
    
    return acc;
  }, {});

  // Month Statistics
  let monthPnl = 0;
  let monthWins = 0;
  let monthLosses = 0;
  let maxPnlAbsolute = 0;

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (tradesByDate[dateStr]) {
      monthPnl += tradesByDate[dateStr].pnl;
      monthWins += tradesByDate[dateStr].wins;
      monthLosses += tradesByDate[dateStr].losses;
      if (Math.abs(tradesByDate[dateStr].pnl) > maxPnlAbsolute) {
         maxPnlAbsolute = Math.abs(tradesByDate[dateStr].pnl);
      }
    }
  });

  const monthWinrate = (monthWins + monthLosses) > 0 ? ((monthWins / (monthWins + monthLosses)) * 100).toFixed(1) : 0;

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getCellBackground = (pnl) => {
    if (!pnl || pnl === 0) return 'rgba(255, 255, 255, 0.02)';
    const intensity = Math.max(0.15, Math.min(Math.abs(pnl) / (maxPnlAbsolute || 1), 0.8));
    if (pnl > 0) return `rgba(16, 185, 129, ${intensity})`; // Emerald
    return `rgba(239, 68, 68, ${intensity})`; // Red
  };

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
        <h2>Performance Heatmap</h2>
        <div className="flex-row" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '4px' }}>
          <button className="btn" style={{ padding: '8px', background: 'transparent' }} onClick={prevMonth}>
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ margin: '0 16px', minWidth: '160px', textAlign: 'center', fontSize: '1.1rem' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button className="btn" style={{ padding: '8px', background: 'transparent' }} onClick={nextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Month Stats Summary */}
      <div className="form-card-grid" style={{ marginBottom: '24px' }}>
        <div className="form-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: monthPnl >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '12px', color: monthPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Net P&L (Month)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: monthPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {monthPnl >= 0 ? '+' : ''}{monthPnl.toFixed(2)}$
            </div>
          </div>
        </div>
        <div className="form-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '12px', borderRadius: '12px', color: 'var(--accent)' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Winrate (Month)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{monthWinrate}%</div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {day}
            </div>
          ))}
          
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
             <div key={`empty-${i}`}></div>
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = tradesByDate[dateStr];
            const pnl = data ? data.pnl : 0;
            const isHovered = hoveredDate === dateStr;
            
            return (
              <div key={dateStr} style={{ 
                padding: '12px', 
                background: getCellBackground(pnl), 
                minHeight: '100px',
                borderRadius: '12px',
                border: isToday(day) ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                position: 'relative',
                cursor: data ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => { 
                setHoveredDate(dateStr);
                if(data) e.currentTarget.style.transform = 'scale(1.05)'; 
              }}
              onMouseLeave={(e) => { 
                setHoveredDate(null);
                if(data) e.currentTarget.style.transform = 'scale(1)'; 
              }}
              >
                {isHovered && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); router.push(`/add?date=${dateStr}`); }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px', background: 'var(--accent)', 
                      color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.6)'
                    }}
                    title="Add trade for this day"
                  >
                    <Plus size={16} />
                  </button>
                )}
                <div style={{ color: isToday(day) ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isToday(day) ? 'bold' : 'normal', marginBottom: '8px' }}>
                  {format(day, 'd')}
                </div>
                {data && (
                  <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}$
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: '4px' }}>
                      {data.count} trades
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
