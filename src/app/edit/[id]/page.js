'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Tiptap from '@/components/Tiptap';
import CreatableSelect from 'react-select/creatable';
import { FileText, Target, Activity, Calendar, DollarSign, Brain, BarChart2, Hash, AlertTriangle, PenTool, Clock } from 'lucide-react';

export default function EditTrade({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    account_id: '',
    pair: '',
    direction: 'long',
    pnl_net: '',
    pnl_percentage: '',
    status: 'open',
    session: '',
    setup: '',
    mistake: '',
    rr_ratio: '',
    entry_date: '',
    notes: '',
    psychology_score: 5
  });

  const [tagOptions, setTagOptions] = useState({
    sessions: [],
    setups: [],
    mistakes: []
  });

  useEffect(() => {
    // Load accounts and tags
    fetch('/api/accounts').then(res => res.json()).then(data => setAccounts(data));
    fetch('/api/tags').then(res => res.json()).then(data => {
      if (data && data.sessions) setTagOptions(data);
    }).catch(console.error);

    // Load existing trade
    fetch(`/api/trades/${unwrappedParams.id}`)
      .then(res => res.json())
      .then(trade => {
        setFormData({
          account_id: trade.account_id,
          pair: trade.pair,
          direction: trade.direction,
          pnl_net: trade.pnl_net !== null ? trade.pnl_net : '',
          pnl_percentage: trade.pnl_percentage !== null ? trade.pnl_percentage : '',
          status: trade.status,
          session: trade.session || '',
          setup: trade.setup || '',
          mistake: trade.mistake || '',
          rr_ratio: trade.rr_ratio !== null ? trade.rr_ratio : '',
          entry_date: trade.entry_date,
          notes: trade.notes || '',
          psychology_score: trade.psychology_score
        });
        setLoading(false);
      });
  }, [unwrappedParams.id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (content) => {
    setFormData({ ...formData, notes: content });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/trades/${unwrappedParams.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...formData,
        pnl_net: formData.pnl_net !== '' ? parseFloat(formData.pnl_net) : null,
        pnl_percentage: formData.pnl_percentage !== '' && formData.pnl_percentage !== null ? parseFloat(formData.pnl_percentage) : null,
        rr_ratio: formData.rr_ratio !== '' ? parseFloat(formData.rr_ratio) : null,
        psychology_score: parseInt(formData.psychology_score)
      })
    });
    
    if (res.ok) {
      router.push(`/trades/${unwrappedParams.id}`);
    } else {
      const errorData = await res.json();
      alert('Error updating trade: ' + errorData.error);
    }
  };

  if (loading) return <div className="page-container fade-in"><p>Loading trade data...</p></div>;

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Edit Trade</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-card-grid">
          
          {/* Card 1: Basic Info */}
          <div className="form-card">
            <h3><FileText size={18} /> Basic Info</h3>
            <div className="form-group">
              <label><Hash size={14} style={{display:'inline', marginBottom:'-2px'}}/> Account</label>
              <select name="account_id" value={formData.account_id} onChange={handleChange} required>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label><BarChart2 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Pair</label>
              <input name="pair" placeholder="e.g. EUR/USD" value={formData.pair} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><Calendar size={14} style={{display:'inline', marginBottom:'-2px'}}/> Date</label>
              <input name="entry_date" type="datetime-local" value={formData.entry_date} onChange={handleChange} required />
            </div>
          </div>

          {/* Card 2: Strategy */}
          <div className="form-card">
            <h3><Target size={18} /> Strategy</h3>
            <div className="form-group">
              <label>Direction</label>
              <div className="segmented-control">
                <button type="button" 
                  className={`pill-btn ${formData.direction === 'long' ? 'active long' : ''}`}
                  onClick={() => setFormData({...formData, direction: 'long'})}>
                  Long
                </button>
                <button type="button" 
                  className={`pill-btn ${formData.direction === 'short' ? 'active short' : ''}`}
                  onClick={() => setFormData({...formData, direction: 'short'})}>
                  Short
                </button>
              </div>
            </div>
            <div className="form-group">
              <label><Clock size={14} style={{display:'inline', marginBottom:'-2px'}}/> Session</label>
              <CreatableSelect 
                isClearable
                value={formData.session ? { value: formData.session, label: formData.session } : null}
                onChange={(newValue) => setFormData({...formData, session: newValue ? newValue.value : ''})}
                options={[...(tagOptions.sessions || []), { value: 'London', label: 'London' }, { value: 'New York', label: 'New York' }, { value: 'Asian', label: 'Asian' }]}
                styles={{
                  control: (base, state) => ({ 
                    ...base, background: state.isFocused ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderColor: state.isFocused ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '2px', boxShadow: state.isFocused ? '0 0 0 3px var(--accent-glow), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'all 0.3s', cursor: 'text'
                  }),
                  menu: (base) => ({ ...base, background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', zIndex: 50 }),
                  option: (base, { isFocused }) => ({ ...base, background: isFocused ? 'var(--surface-hover)' : 'transparent', cursor: 'pointer', padding: '12px 16px' }),
                  singleValue: (base) => ({ ...base, color: 'var(--text-main)' }), input: (base) => ({ ...base, color: 'var(--text-main)' }), placeholder: (base) => ({ ...base, color: 'var(--text-muted)' })
                }}
              />
            </div>
            <div className="form-group">
              <label><Target size={14} style={{display:'inline', marginBottom:'-2px'}}/> Setup</label>
              <CreatableSelect 
                isClearable
                value={formData.setup ? { value: formData.setup, label: formData.setup } : null}
                onChange={(newValue) => setFormData({...formData, setup: newValue ? newValue.value : ''})}
                options={[...(tagOptions.setups || []), { value: 'Breakout', label: 'Breakout' }, { value: 'SMC', label: 'SMC' }]}
                styles={{
                  control: (base, state) => ({ 
                    ...base, background: state.isFocused ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderColor: state.isFocused ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '2px', boxShadow: state.isFocused ? '0 0 0 3px var(--accent-glow), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'all 0.3s', cursor: 'text'
                  }),
                  menu: (base) => ({ ...base, background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', zIndex: 50 }),
                  option: (base, { isFocused }) => ({ ...base, background: isFocused ? 'var(--surface-hover)' : 'transparent', cursor: 'pointer', padding: '12px 16px' }),
                  singleValue: (base) => ({ ...base, color: 'var(--text-main)' }), input: (base) => ({ ...base, color: 'var(--text-main)' }), placeholder: (base) => ({ ...base, color: 'var(--text-muted)' })
                }}
              />
            </div>
          </div>

          {/* Card 3: Execution & Results */}
          <div className="form-card">
            <h3><Activity size={18} /> Execution</h3>
            <div className="form-group">
              <label>Status</label>
              <div className="segmented-control">
                {['open', 'win', 'loss', 'breakeven'].map(status => (
                  <button key={status} type="button" 
                    className={`pill-btn ${formData.status === status ? `active ${status}` : ''}`}
                    style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                    onClick={() => setFormData({...formData, status})}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label><DollarSign size={14} style={{display:'inline', marginBottom:'-2px'}}/> P&L Net</label>
                <input name="pnl_net" type="number" step="0.01" value={formData.pnl_net} onChange={handleChange} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>P&L (%)</label>
                <input name="pnl_percentage" type="number" step="0.01" value={formData.pnl_percentage} onChange={handleChange} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>RRR</label>
                <input name="rr_ratio" type="number" step="0.1" value={formData.rr_ratio} onChange={handleChange} placeholder="e.g. 2.5" />
              </div>
            </div>

            <div className="form-group">
              <label><AlertTriangle size={14} style={{display:'inline', marginBottom:'-2px'}}/> Mistakes</label>
              <CreatableSelect 
                isClearable
                value={formData.mistake ? { value: formData.mistake, label: formData.mistake } : null}
                onChange={(newValue) => setFormData({...formData, mistake: newValue ? newValue.value : ''})}
                options={[...(tagOptions.mistakes || []), { value: 'None', label: 'None' }, { value: 'FOMO', label: 'FOMO' }]}
                styles={{
                  control: (base, state) => ({ ...base, background: state.isFocused ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderColor: state.isFocused ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '2px', boxShadow: state.isFocused ? '0 0 0 3px var(--accent-glow), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'all 0.3s', cursor: 'text' }),
                  menu: (base) => ({ ...base, background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', zIndex: 50 }),
                  option: (base, { isFocused }) => ({ ...base, background: isFocused ? 'var(--surface-hover)' : 'transparent', cursor: 'pointer', padding: '12px 16px' }),
                  singleValue: (base) => ({ ...base, color: 'var(--text-main)' }), input: (base) => ({ ...base, color: 'var(--text-main)' }), placeholder: (base) => ({ ...base, color: 'var(--text-muted)' })
                }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '24px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><Brain size={14} style={{display:'inline', marginBottom:'-2px'}}/> Psychology Score</span>
                <span style={{ 
                  color: formData.psychology_score < 4 ? 'var(--danger)' : formData.psychology_score > 7 ? 'var(--success)' : 'var(--warning)', 
                  fontWeight: 'bold', fontSize: '1.2rem' 
                }}>
                  {formData.psychology_score}
                </span>
              </label>
              <input 
                name="psychology_score" type="range" min="1" max="10" 
                value={formData.psychology_score} onChange={handleChange} 
                style={{
                  background: `linear-gradient(to right, var(--danger) 0%, var(--warning) 50%, var(--success) 100%)`,
                  opacity: 0.8
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>Emotional (1)</span>
                <span>Disciplined (10)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-card" style={{ marginBottom: '32px' }}>
          <h3><PenTool size={18} /> Trade Journal</h3>
          <div style={{ marginBottom: '24px' }}>
            <Tiptap onChange={handleEditorChange} content={formData.notes} />
          </div>
          <div className="flex-row" style={{ gap: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>
              Save Changes
            </button>
            <button type="button" onClick={() => router.push(`/trades/${unwrappedParams.id}`)} className="btn btn-secondary" style={{ padding: '16px', fontSize: '1.1rem' }}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
