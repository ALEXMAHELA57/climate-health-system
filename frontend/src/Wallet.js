import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowLeft, Gift, Plus } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function Wallet({ lang, setPage }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const user = JSON.parse(localStorage.getItem('afya_user') || 'null');

  const [wallet, setWallet] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ amount: '', payment_provider: 'Mpesa', phone: user?.phone || '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch(`${API}/api/wallet/balance`, { headers: authHeaders() });
      setWallet(await res.json());
    } catch { /* silent */ }
  }

  async function submitTopUp() {
    if (!topUpForm.amount || parseFloat(topUpForm.amount) < 1000) {
      setMsg(sw ? 'Kiasi cha chini ni TZS 1,000' : 'Minimum top-up is TZS 1,000');
      return;
    }
    if (!topUpForm.phone.trim()) {
      setMsg(sw ? 'Weka nambari ya simu' : 'Enter a phone number');
      return;
    }
    setSubmitting(true); setMsg('');
    try {
      const res = await fetch(`${API}/api/wallet/topup`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...topUpForm, amount: parseFloat(topUpForm.amount) }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.bonus_applied ? (sw ? '✓ Imefanikiwa! AfyaBonus ya 10% imeongezwa' : '✓ Success! 10% AfyaBonus added') : (sw ? '✓ Imefanikiwa' : '✓ Success'));
        setTopUpForm({ ...topUpForm, amount: '' });
        setShowTopUp(false);
        load();
      } else setMsg(data.error || (sw ? 'Imeshindwa' : 'Failed'));
    } catch { setMsg(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  if (!wallet) return <div style={{ padding: 40, textAlign: 'center', color: theme.textFaint }}>{sw ? 'Inapakia...' : 'Loading...'}</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => setPage('profile')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> {sw ? 'Rudi' : 'Back'}
      </button>

      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 16, padding: 20, color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.9 }}>
          <WalletIcon size={16} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>AFYAWEKEZA</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>TZS {wallet.balance.toLocaleString()}</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
          {sw ? 'Salio hili linatumika tu kwenye huduma za AfyaHewa' : 'This balance can only be spent on AfyaHewa services'}
        </div>
      </div>

      {wallet.bonus_available ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gift size={22} color="#16a34a" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{sw ? 'AfyaBonus Inapatikana!' : 'AfyaBonus Available!'}</div>
            <div style={{ fontSize: 11, color: '#166534' }}>{sw ? `Ongeza pesa sasa upate ${Math.round(wallet.bonus_rate * 100)}% ziada` : `Top up now to get an extra ${Math.round(wallet.bonus_rate * 100)}% credited`}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            {sw
              ? `Huduma ${wallet.services_until_bonus} zaidi zilizolipiwa kufungua AfyaBonus (${Math.round(wallet.bonus_rate * 100)}% ziada wakati wa kuongeza pesa)`
              : `${wallet.services_until_bonus} more paid services to unlock AfyaBonus (${Math.round(wallet.bonus_rate * 100)}% extra on your next top-up)`}
          </div>
          <div style={{ height: 6, background: theme.border, borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#7c3aed', width: `${((6 - wallet.services_until_bonus) / 6) * 100}%`, borderRadius: 99 }} />
          </div>
        </div>
      )}

      {!showTopUp ? (
        <button onClick={() => setShowTopUp(true)} style={{ width: '100%', padding: 13, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          <Plus size={16} /> {sw ? 'Ongeza Pesa' : 'Top Up'}
        </button>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <input type="number" placeholder={sw ? 'Kiasi (TZS)' : 'Amount (TZS)'} value={topUpForm.amount} onChange={e => setTopUpForm({ ...topUpForm, amount: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, boxSizing: 'border-box' }} />
          <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={topUpForm.phone} onChange={e => setTopUpForm({ ...topUpForm, phone: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, boxSizing: 'border-box' }} />
          <select value={topUpForm.payment_provider} onChange={e => setTopUpForm({ ...topUpForm, payment_provider: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, boxSizing: 'border-box' }}>
            <option value="Mpesa">M-Pesa</option>
            <option value="Tigo">Tigo Pesa</option>
            <option value="Airtel">Airtel Money</option>
            <option value="Halopesa">HaloPesa</option>
            <option value="Azampesa">AzamPesa</option>
          </select>
          {!!msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#166534' : '#ef4444', marginBottom: 8 }}>{msg}</p>}
          <button onClick={submitTopUp} disabled={submitting}
            style={{ width: '100%', padding: 12, background: submitting ? '#c4b5fd' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer' }}>
            {submitting ? (sw ? 'Inashughulikia...' : 'Processing...') : (sw ? 'Thibitisha' : 'Confirm Top Up')}
          </button>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 10 }}>{sw ? 'HISTORIA' : 'HISTORY'}</div>
      {wallet.transactions.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna historia bado' : 'No transactions yet'}</p>}
      {wallet.transactions.map((t, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <div style={{ fontSize: 13, color: theme.text }}>{t.description}</div>
            <div style={{ fontSize: 11, color: theme.textFaint }}>{new Date(t.created_at).toLocaleDateString()}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.amount >= 0 ? '#16a34a' : '#ef4444' }}>
            {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
