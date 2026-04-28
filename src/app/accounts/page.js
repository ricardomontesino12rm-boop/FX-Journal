'use client';
import { useState, useEffect } from 'react';
import { Edit2, X, Trash2, Wallet, Award, Activity } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('personal');
  const [balance, setBalance] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetch('/api/accounts').then(res => res.json()).then(setAccounts);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const res = await fetch(`/api/accounts/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, type, initial_balance: parseFloat(balance) })
      });
      if (res.ok) {
        const updatedAcc = await res.json();
        setAccounts(accounts.map(a => a.id === editingId ? updatedAcc : a));
        setEditingId(null);
        setName('');
        setType('personal');
        setBalance('');
      } else {
        const errorData = await res.json();
        alert('Error updating account: ' + errorData.error);
      }
    } else {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ name, type, initial_balance: parseFloat(balance) })
      });
      if (res.ok) {
        const newAcc = await res.json();
        setAccounts([newAcc, ...accounts]);
        setName('');
        setType('personal');
        setBalance('');
      } else {
        const errorData = await res.json();
        alert('Error creating account: ' + errorData.error);
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the account "${name}"? WARNING: All trades associated with this account will be permanently deleted.`)) {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
      } else {
        const errorData = await res.json();
        alert('Error deleting account: ' + errorData.error);
      }
    }
  };

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type || 'personal');
    setBalance(acc.initial_balance);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setType('personal');
    setBalance('');
  };

  const getAccountIcon = (accType) => {
    switch (accType) {
      case 'challenge': return <Activity size={24} color="var(--warning)" />;
      case 'funded': return <Award size={24} color="var(--success)" />;
      case 'demo': return <Activity size={24} color="var(--text-muted)" />;
      default: return <Wallet size={24} color="var(--accent)" />;
    }
  };

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: '24px' }}>Manage Accounts</h2>
      
      <div className="form-card" style={{ maxWidth: '600px', marginBottom: '40px' }}>
        <h3>{editingId ? 'Edit Account' : 'Create New Account'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Account Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 100k" />
            </div>
            <div className="form-group">
              <label>Account Type</label>
              <select required value={type} onChange={e => setType(e.target.value)}>
                <option value="personal">Personal / Real</option>
                <option value="challenge">Challenge / Eval</option>
                <option value="funded">Funded</option>
                <option value="demo">Demo</option>
              </select>
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Initial Balance ($)</label>
            <input required type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="100000" />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
              {editingId ? 'Update Account' : 'Create Account'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ flex: 1 }}>
                <X size={16} style={{display: 'inline', marginBottom: '-2px'}}/> Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <h3 style={{ marginBottom: '20px' }}>Your Portfolios</h3>
      {accounts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No accounts created yet.</p>
      ) : (
        <div className="form-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {accounts.map(acc => (
            <div key={acc.id} className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{acc.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {acc.type || 'Personal'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Initial Balance</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${acc.initial_balance.toLocaleString()}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleEdit(acc)} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(acc.id, acc.name)} className="btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
