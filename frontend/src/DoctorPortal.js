import React, { useState, useEffect } from 'react';
import { Stethoscope, Calendar, MessageCircle, Settings, LogOut } from 'lucide-react';
import { API } from './constants';
import Chat from './Chat';

function authHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function DoctorPortal() {
  const [token, setToken] = useState(() => localStorage.getItem('afya_doctor_token'));
  const [doctor, setDoctor] = useState(() => JSON.parse(localStorage.getItem('afya_doctor') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [view, setView] = useState('appointments'); // appointments | settings
  const [changeRequests, setChangeRequests] = useState([]);
  const [proposedPrices, setProposedPrices] = useState('');
  const [negotiations, setNegotiations] = useState([]);
  const [counterPrice, setCounterPrice] = useState({});

  useEffect(() => { if (token) loadAppointments(); }, [token]);

  async function login() {
    setError('');
    try {
      const res = await fetch(`${API}/api/doctor/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('afya_doctor_token', data.token);
        localStorage.setItem('afya_doctor', JSON.stringify(data.doctor));
        setToken(data.token); setDoctor(data.doctor);
      } else setError(data.error || 'Login failed');
    } catch { setError('Connection error'); }
  }

  function logout() {
    localStorage.removeItem('afya_doctor_token'); localStorage.removeItem('afya_doctor');
    setToken(null); setDoctor(null);
  }

  async function loadAppointments() {
    try {
      const res = await fetch(`${API}/api/doctor/appointments`, { headers: authHeaders(token) });
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch { /* silent */ }
  }

  async function updateStatus(appointmentId, status) {
    await fetch(`${API}/api/doctor/appointments/${appointmentId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) }).catch(() => {});
    loadAppointments();
  }

  async function loadChangeRequests() {
    try {
      const res = await fetch(`${API}/api/doctor/change-requests/mine`, { headers: authHeaders(token) });
      const data = await res.json();
      setChangeRequests(data.requests || []);
    } catch { /* silent */ }
  }

  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [priceMsg, setPriceMsg] = useState('');
  async function submitPriceChange() {
    if (!proposedPrices.trim() || submittingPrice) return;
    setSubmittingPrice(true); setPriceMsg('');
    try {
      const res = await fetch(`${API}/api/doctor/change-requests`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ field: 'prices', proposed_value: proposedPrices }) });
      const data = await res.json();
      if (data.success) {
        setPriceMsg('✓ Submitted - pending admin review');
        setProposedPrices('');
        loadChangeRequests();
      } else {
        setPriceMsg(data.error || 'Something went wrong - please try again');
      }
    } catch { setPriceMsg('Connection error - please try again'); }
    setSubmittingPrice(false);
  }

  useEffect(() => { if (view === 'settings') { loadChangeRequests(); loadNegotiations(); loadAvailability(); loadContactPhone(); } }, [view]);

  const [availability, setAvailability] = useState('auto');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  async function loadContactPhone() {
    try {
      const res = await fetch(`${API}/api/doctor/me`, { headers: authHeaders(token) });
      const data = await res.json();
      setContactPhone(data.doctor?.phone || '');
    } catch { /* silent */ }
  }

  async function saveContactPhone() {
    setContactMsg('');
    try {
      const res = await fetch(`${API}/api/doctor/contact`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ phone: contactPhone }) });
      const data = await res.json();
      setContactMsg(data.success ? '✓ Saved' : (data.error || 'Failed'));
    } catch { setContactMsg('Connection error'); }
  }

  async function changePassword() {
    setPwMsg('');
    if (pwForm.new_password !== pwForm.confirm_password) { setPwMsg('New passwords don\'t match'); return; }
    if (pwForm.new_password.length < 8) { setPwMsg('New password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      const res = await fetch(`${API}/api/doctor/change-password`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
      });
      const data = await res.json();
      if (data.success) { setPwMsg('✓ Password changed'); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); }
      else setPwMsg(data.error || 'Failed');
    } catch { setPwMsg('Connection error'); }
    setChangingPw(false);
  }
  async function loadAvailability() {
    try {
      const res = await fetch(`${API}/api/doctor/availability`, { headers: authHeaders(token) });
      const data = await res.json();
      setAvailability(data.manual_availability || 'auto');
    } catch { /* silent */ }
  }
  async function setAvailabilityStatus(status) {
    try {
      await fetch(`${API}/api/doctor/availability`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ status }) });
      setAvailability(status);
    } catch { /* silent */ }
  }

  async function loadNegotiations() {
    try {
      const res = await fetch(`${API}/api/doctor/negotiations`, { headers: authHeaders(token) });
      const data = await res.json();
      setNegotiations(data.negotiations || []);
    } catch { /* silent */ }
  }

  async function respondNegotiation(id, action) {
    try {
      await fetch(`${API}/api/doctor/negotiations/${id}/respond`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ action, counter_price: counterPrice[id] ? parseFloat(counterPrice[id]) : null }),
      });
      loadNegotiations();
    } catch { /* silent */ }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, maxWidth: 380, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Stethoscope size={32} color="#2563eb" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>AfyaHewa Doctor Portal</div>
        </div>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
        <button onClick={login} style={{ padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Log In</button>
      </div>
    );
  }

  if (activeChat) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ Back to Appointments</button>
        <Chat lang="en" appointmentId={activeChat} token={token} senderType="doctor" />
      </div>
    );
  }

  const statusColor = { pending: '#d97706', confirmed: '#2563eb', completed: '#166534', cancelled: '#991b1b' };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#2563eb', color: '#fff', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{doctor?.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{doctor?.specialty}</div>
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: 8, cursor: 'pointer' }}><LogOut size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 16 }}>
        <button onClick={() => setView('appointments')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'appointments' ? '#2563eb' : '#fff', color: view === 'appointments' ? '#fff' : '#6b7280' }}>
          <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Appointments
        </button>
        <button onClick={() => setView('settings')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'settings' ? '#2563eb' : '#fff', color: view === 'settings' ? '#fff' : '#6b7280' }}>
          <Settings size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Settings
        </button>
      </div>

      {view === 'appointments' && (
        <div style={{ padding: '0 16px' }}>
          {appointments.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No appointments yet</p>}
          {appointments.map(a => (
            <div key={a.appointment_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.patient_name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{a.requested_date} · {a.requested_time} · {a.consultation_type}</div>
                  {!!a.reason && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{a.reason}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[a.status], background: '#f3f4f6', padding: '3px 10px', borderRadius: 99 }}>{a.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => setActiveChat(a.appointment_id)} style={{ flex: 1, padding: 8, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MessageCircle size={13} /> Chat
                </button>
                {a.status === 'pending' && (
                  <button onClick={() => updateStatus(a.appointment_id, 'confirmed')} style={{ flex: 1, padding: 8, background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                )}
                {a.status === 'confirmed' && (
                  <button onClick={() => updateStatus(a.appointment_id, 'completed')} style={{ flex: 1, padding: 8, background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Completed</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'settings' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Availability</div>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>Auto follows your listed working hours. Override it here anytime.</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {['auto', 'online', 'offline'].map(s => (
                <button key={s} onClick={() => setAvailabilityStatus(s)}
                  style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    background: availability === s ? (s === 'online' ? '#16a34a' : s === 'offline' ? '#991b1b' : '#2563eb') : '#f3f4f6',
                    color: availability === s ? '#fff' : '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>My Contact Phone</div>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>Only visible to admin - never shown to patients.</p>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+255..."
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
            {!!contactMsg && <p style={{ fontSize: 12, marginBottom: 8, color: contactMsg.startsWith('✓') ? '#166534' : '#ef4444', fontWeight: 600 }}>{contactMsg}</p>}
            <button onClick={saveContactPhone} style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Change Password</div>
            <input type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="Current password"
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
            <input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="New password"
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
            <input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })} placeholder="Confirm new password"
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
            {!!pwMsg && <p style={{ fontSize: 12, marginBottom: 8, color: pwMsg.startsWith('✓') ? '#166534' : '#ef4444', fontWeight: 600 }}>{pwMsg}</p>}
            <button onClick={changePassword} disabled={changingPw}
              style={{ width: '100%', padding: 10, background: changingPw ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: changingPw ? 'default' : 'pointer' }}>
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Propose a Price Change</div>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Enter as JSON, e.g. {`{"chat": 6000, "voice": 9000}`}. Sits pending until admin approves.</p>
            <input value={proposedPrices} onChange={e => setProposedPrices(e.target.value)} placeholder='{"chat": 6000}'
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
            {!!priceMsg && <p style={{ fontSize: 12, marginBottom: 8, color: priceMsg.startsWith('✓') ? '#166534' : '#ef4444', fontWeight: 600 }}>{priceMsg}</p>}
            <button onClick={submitPriceChange} disabled={submittingPrice}
              style={{ width: '100%', padding: 10, background: submittingPrice ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submittingPrice ? 'default' : 'pointer' }}>
              {submittingPrice ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>FEE NEGOTIATION REQUESTS</div>
          {negotiations.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>No pending requests</p>}
          {negotiations.map(n => (
            <div key={n.negotiation_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{n.patient_name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                {n.consultation_type}: proposed TZS {n.proposed_price.toLocaleString()} (listed TZS {n.original_price.toLocaleString()})
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <button onClick={() => respondNegotiation(n.negotiation_id, 'accept')} style={{ flex: 1, padding: 7, background: '#166534', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Accept</button>
                <button onClick={() => respondNegotiation(n.negotiation_id, 'decline')} style={{ flex: 1, padding: 7, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Decline</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" placeholder="Counter price" value={counterPrice[n.negotiation_id] || ''} onChange={e => setCounterPrice({ ...counterPrice, [n.negotiation_id]: e.target.value })}
                  style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <button onClick={() => respondNegotiation(n.negotiation_id, 'counter')} style={{ padding: '7px 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Counter</button>
              </div>
            </div>
          ))}

          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>MY REQUESTS</div>
          {changeRequests.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No requests yet</p>}
          {changeRequests.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>{r.field}: {r.proposed_value}</div>
              <div style={{ color: r.status === 'approved' ? '#166534' : r.status === 'rejected' ? '#991b1b' : '#d97706' }}>{r.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
