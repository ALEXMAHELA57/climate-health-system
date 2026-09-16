import React, { useState, useEffect } from 'react';
import { FlaskConical, ClipboardList, DollarSign, LogOut, Plus } from 'lucide-react';
import { API } from './constants';
import PasswordInput from './PasswordInput';

function authHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const CATEGORY_LABELS = {
  blood: 'Blood Tests', diabetes: 'Diabetes', hiv_sti: 'HIV / STI Testing', pregnancy: 'Pregnancy',
  cholesterol: 'Cholesterol', kidney_liver: 'Kidney/Liver', other: 'Other Diagnostics',
};

export default function LabPortal() {
  const [token, setToken] = useState(() => localStorage.getItem('afya_lab_token'));
  const [lab, setLab] = useState(() => JSON.parse(localStorage.getItem('afya_lab') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [view, setView] = useState('bookings'); // bookings | tests
  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);
  const [resultDrafts, setResultDrafts] = useState({});

  const [showAddTest, setShowAddTest] = useState(false);
  const [testForm, setTestForm] = useState({ name: '', category: 'blood', price: '' });

  useEffect(() => { if (token) loadView(); }, [token, view]);

  async function login() {
    setError('');
    try {
      const res = await fetch(`${API}/api/lab/lab-portal/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('afya_lab_token', data.token);
        localStorage.setItem('afya_lab', JSON.stringify(data.lab));
        setToken(data.token); setLab(data.lab);
      } else setError(data.error || 'Login failed');
    } catch { setError('Connection error'); }
  }

  function logout() {
    localStorage.removeItem('afya_lab_token'); localStorage.removeItem('afya_lab');
    setToken(null); setLab(null);
  }

  async function loadView() {
    try {
      if (view === 'bookings') {
        const res = await fetch(`${API}/api/lab/lab-portal/bookings`, { headers: authHeaders(token) });
        setBookings((await res.json()).bookings || []);
      } else {
        const res = await fetch(`${API}/api/lab/lab-portal/tests`, { headers: authHeaders(token) });
        setTests((await res.json()).tests || []);
      }
    } catch { /* silent */ }
  }

  async function updateStatus(bookingId, status) {
    await fetch(`${API}/api/lab/lab-portal/bookings/${bookingId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) }).catch(() => {});
    loadView();
  }

  async function submitResult(bookingId) {
    const summary = resultDrafts[bookingId];
    if (!summary || !summary.trim()) return;
    await fetch(`${API}/api/lab/lab-portal/bookings/${bookingId}/result`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ result_summary: summary }) }).catch(() => {});
    setResultDrafts({ ...resultDrafts, [bookingId]: '' });
    loadView();
  }

  async function addTest() {
    if (!testForm.name.trim() || !testForm.price) return;
    try {
      await fetch(`${API}/api/lab/lab-portal/tests`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ ...testForm, price: parseFloat(testForm.price) }),
      });
      setShowAddTest(false);
      setTestForm({ name: '', category: 'blood', price: '' });
      loadView();
    } catch { /* silent */ }
  }

  async function updateTestPrice(testId, price) {
    await fetch(`${API}/api/lab/lab-portal/tests/${testId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ price: parseFloat(price) }) }).catch(() => {});
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, maxWidth: 380, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <FlaskConical size={32} color="#16a34a" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>AfyaHewa Lab Portal</div>
        </div>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        <PasswordInput placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
        <button onClick={login} style={{ padding: 13, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Log In</button>
      </div>
    );
  }

  const statusColor = { booked: '#d97706', sample_collected: '#2563eb', results_ready: '#166534', cancelled: '#991b1b' };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#16a34a', color: '#fff', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{lab?.name}</div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: 8, cursor: 'pointer' }}><LogOut size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 16 }}>
        <button onClick={() => setView('bookings')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'bookings' ? '#16a34a' : '#fff', color: view === 'bookings' ? '#fff' : '#6b7280' }}>
          <ClipboardList size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Bookings
        </button>
        <button onClick={() => setView('tests')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'tests' ? '#16a34a' : '#fff', color: view === 'tests' ? '#fff' : '#6b7280' }}>
          <DollarSign size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Tests & Pricing
        </button>
      </div>

      {view === 'bookings' && (
        <div style={{ padding: '0 16px' }}>
          {bookings.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No bookings yet</p>}
          {bookings.map(b => (
            <div key={b.booking_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{b.test_name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[b.status] }}>{b.status.replace('_', ' ')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>{b.patient_name} · {b.patient_phone} · {b.scheduled_date}</div>
              {b.status !== 'results_ready' && b.status !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {['booked', 'sample_collected'].map(s => (
                    <button key={s} onClick={() => updateStatus(b.booking_id, s)}
                      style={{ flex: 1, padding: 7, background: b.status === s ? '#2563eb' : '#f3f4f6', color: b.status === s ? '#fff' : '#374151', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' }}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
              {b.status === 'results_ready' ? (
                <div style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', padding: 8, borderRadius: 6 }}>✓ {b.result_summary}</div>
              ) : b.status !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input placeholder="Enter result summary..." value={resultDrafts[b.booking_id] || ''} onChange={e => setResultDrafts({ ...resultDrafts, [b.booking_id]: e.target.value })}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <button onClick={() => submitResult(b.booking_id)} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Submit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'tests' && (
        <div style={{ padding: '0 16px' }}>
          <button onClick={() => setShowAddTest(s => !s)}
            style={{ width: '100%', padding: 10, marginBottom: 14, background: showAddTest ? '#fff' : '#f0fdf4', border: `1px solid ${showAddTest ? '#e5e7eb' : '#bbf7d0'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: showAddTest ? '#6b7280' : '#166534' }}>
            <Plus size={14} /> {showAddTest ? 'Cancel' : 'Add Test'}
          </button>

          {showAddTest && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <input value={testForm.name} onChange={e => setTestForm({ ...testForm, name: e.target.value })} placeholder="Test name"
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
              <select value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })}
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }}>
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <input value={testForm.price} onChange={e => setTestForm({ ...testForm, price: e.target.value })} placeholder="Price (TZS)" type="number"
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
              <button onClick={addTest} style={{ width: '100%', padding: 10, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Test</button>
            </div>
          )}

          {tests.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No tests yet</p>}
          {tests.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{CATEGORY_LABELS[t.category] || t.category}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>TZS</span>
                <input type="number" defaultValue={t.price} onBlur={e => updateTestPrice(t.id, e.target.value)}
                  style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
