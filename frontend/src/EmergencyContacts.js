import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Trash2, Siren, CheckCircle2 } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const HOLD_MS = 2000;

export default function EmergencyContacts({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relationship_type: 'family' });
  const [error, setError] = useState('');

  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [result, setResult] = useState(null);
  const holdTimer = useRef(null);
  const progressTimer = useRef(null);

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/emergency-contacts/contacts`, { headers: authHeaders() });
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function submitContact() {
    if (!form.name.trim() || !form.phone.trim()) { setError(sw ? 'Jaza jina na nambari ya simu' : 'Enter a name and phone number'); return; }
    setError('');
    try {
      const res = await fetch(`${API}/api/emergency-contacts/contacts`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setShowForm(false); setForm({ name: '', phone: '', relationship_type: 'family' }); loadContacts(); }
      else setError(data.error || (sw ? 'Hitilafu' : 'Something went wrong'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
  }

  async function removeContact(id) {
    await fetch(`${API}/api/emergency-contacts/contacts/${id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
    loadContacts();
  }

  function startHold() {
    if (contacts.length === 0) return;
    setHolding(true); setHoldProgress(0); setResult(null);
    const start = Date.now();
    progressTimer.current = setInterval(() => setHoldProgress(Math.min(100, ((Date.now() - start) / HOLD_MS) * 100)), 30);
    holdTimer.current = setTimeout(fireAlert, HOLD_MS);
  }

  function cancelHold() {
    setHolding(false); setHoldProgress(0);
    clearTimeout(holdTimer.current);
    clearInterval(progressTimer.current);
  }

  async function fireAlert() {
    clearInterval(progressTimer.current);
    setHolding(false); setHoldProgress(0);

    let coords = {};
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch { /* proceed without location */ }

    try {
      const res = await fetch(`${API}/api/emergency-contacts/trigger`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(coords) });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: sw ? 'Hitilafu ya muunganisho' : 'Connection error' });
    }
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 };

  return (
    <div>
      <button
        onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
        onTouchStart={startHold} onTouchEnd={cancelHold}
        disabled={contacts.length === 0}
        style={{
          width: '100%', padding: 18, borderRadius: 14, border: 'none', cursor: contacts.length ? 'pointer' : 'not-allowed',
          background: holding ? '#991b1b' : '#ef4444', color: '#fff', marginBottom: 8, position: 'relative', overflow: 'hidden',
          opacity: contacts.length === 0 ? 0.5 : 1,
        }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${holdProgress}%`, background: 'rgba(255,255,255,0.25)', transition: 'width 0.03s linear' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Siren size={20} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>{holding ? (sw ? 'Shikilia...' : 'Hold...') : (sw ? 'Shikilia kwa Dharura' : 'Hold for Emergency Alert')}</span>
        </div>
      </button>
      <p style={{ fontSize: 11, color: theme.textFaint, textAlign: 'center', marginBottom: 16 }}>
        {contacts.length === 0 ? (sw ? 'Ongeza mtu wa dharura kwanza' : 'Add an emergency contact first') : (sw ? 'Shikilia kwa sekunde 2 kutuma tahadhari' : 'Hold for 2 seconds to send an alert')}
      </p>

      {result && (
        <div style={{ background: result.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color={result.success ? '#16a34a' : '#ef4444'} />
          <span style={{ fontSize: 12, color: result.success ? '#166534' : '#991b1b' }}>
            {result.success
              ? (sw ? `Watu ${result.contacts_notified} wamejulishwa` : `${result.contacts_notified} contact(s) notified`)
              : (result.error || (sw ? 'Imeshindwa' : 'Failed to send alert'))}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {sw ? 'Watu wa Dharura' : 'Emergency Contacts'}</p>
        <button onClick={() => setShowForm(s => !s)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Plus size={13} /> {sw ? 'Ongeza' : 'Add'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <input placeholder={sw ? 'Jina' : 'Name'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          <select value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })} style={inputStyle}>
            <option value="family">{sw ? 'Familia' : 'Family'}</option>
            <option value="friend">{sw ? 'Rafiki' : 'Friend'}</option>
            <option value="other">{sw ? 'Nyingine' : 'Other'}</option>
          </select>
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <button onClick={submitContact} style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {sw ? 'Hifadhi' : 'Save'}
          </button>
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
      {!loading && contacts.length === 0 && !showForm && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 10 }}>{sw ? 'Hakuna watu bado' : 'No contacts added yet'}</p>}
      {contacts.map(c => (
        <div key={c.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{c.name}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>{c.phone} · {c.relationship_type}</div>
          </div>
          <button onClick={() => removeContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#ef4444" /></button>
        </div>
      ))}
    </div>
  );
}
