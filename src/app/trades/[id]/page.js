'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, DollarSign, Brain, Edit, Trash2, Printer, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function TradeDetail({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const tradeRef = useRef(null);

  useEffect(() => {
    fetch(`/api/trades/${unwrappedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setTrade(data);
        setLoading(false);
      });
  }, [unwrappedParams.id]);

  if (loading) return <div className="page-container fade-in"><p>Loading...</p></div>;
  if (trade.error) return <div className="page-container fade-in"><p>Trade not found.</p></div>;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this trade? This cannot be undone.')) {
      const res = await fetch(`/api/trades/${unwrappedParams.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/trades');
      } else {
        alert('Failed to delete trade.');
      }
    }
  };

  const handleDownloadPNG = async () => {
    if (tradeRef.current === null) return;
    try {
      const dataUrl = await toPng(tradeRef.current, { 
        cacheBust: true, 
        backgroundColor: 'var(--bg-color)',
        style: { padding: '24px' } // Add padding so it's not flush to the edge
      });
      const link = document.createElement('a');
      link.download = `${trade.pair.replace('/', '-')}_trade.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate PNG', err);
      alert('Failed to generate PNG image.');
    }
  };

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link href="/trades" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Trades
        </Link>
        <div className="flex-row" style={{ gap: '12px' }}>
          <button onClick={handleDownloadPNG} className="btn btn-secondary" title="Save as Image (PNG)">
            <ImageIcon size={16} /> PNG
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary" title="Save as PDF">
            <Printer size={16} /> PDF
          </button>
          <Link href={`/edit/${unwrappedParams.id}`} className="btn btn-secondary">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={handleDelete} className="btn" style={{ background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div ref={tradeRef}>
        <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', margin: '0' }}>{trade.pair}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '8px' }}>
            {trade.account_name} &bull; <span className={`badge ${trade.status}`}>{trade.status}</span> &bull; 
            <span style={{ marginLeft: '8px', color: trade.direction === 'long' ? 'var(--success)' : 'var(--danger)' }}>
              {trade.direction.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px 24px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net P&L</div>
          <div className={`stat-value ${trade.pnl_net > 0 ? 'text-success' : (trade.pnl_net < 0 ? 'text-danger' : '')}`} style={{ margin: '0' }}>
            {trade.pnl_net ? `$${trade.pnl_net.toFixed(2)}` : '$0.00'}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
             {trade.pnl_percentage ? `${trade.pnl_percentage.toFixed(2)}%` : '0%'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
        
        {/* Editor Content Area */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Journal Entry</h3>
          {trade.notes ? (
            <div 
              className="ProseMirror" 
              style={{ background: 'transparent', border: 'none', padding: '0', minHeight: 'auto' }}
              dangerouslySetInnerHTML={{ __html: trade.notes }} 
            />
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No journal entry for this trade.</p>
          )}
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Brain size={18} className="text-warning" /> Pro Analytics
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Setup:</span> <span className="badge" style={{background: 'var(--surface-hover)'}}>{trade.setup || 'N/A'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Session:</span> <span className="badge" style={{background: 'var(--surface-hover)'}}>{trade.session || 'N/A'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Mistake:</span> <span className="badge" style={{background: 'var(--surface-hover)', color: trade.mistake === 'None' ? 'var(--success)' : 'var(--danger)'}}>{trade.mistake || 'N/A'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>RRR:</span> <span style={{ fontWeight: 'bold' }}>{trade.rr_ratio || 'N/A'}</span></div>
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <h5 style={{ color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Psychology</h5>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--accent)' }}>
                {trade.psychology_score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
              </div>
            </div>
          </div>

          <div className="glass-panel">
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={18} /> Timeline
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ENTRY DATE</div>
              <div>{new Date(trade.entry_date).toLocaleString()}</div>
            </div>
            {trade.exit_date && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EXIT DATE</div>
                <div>{new Date(trade.exit_date).toLocaleString()}</div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
