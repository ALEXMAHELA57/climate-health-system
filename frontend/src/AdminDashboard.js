import React, { useState, useEffect } from 'react';

const API = 'https://climate-health-system-backend.onrender.com';

const ADMIN_PASSWORD = 'AfyaHewa2024!';

export default function AdminDashboard({ lang = 'en', onClose }) {
  const sw = lang === 'sw';
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('afya_admin') === 'true');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [reports, setReports] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastDistrict, setBroadcastDistrict] = useState('ALL');
  const [broadcastLang, setBroadcastLang] = useState('both');
  const [sending, setSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (authed) loadData(); }, [authed, tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'subscribers') {
        const r = await fetch(`${API}/api/admin/stats`);
        const d = await r.json();
        setStats(d);
        setSubscribers(d.subscribers || []);
      }
      if (tab === 'reports') {
        const r = await fetch(`${API}/api/community/reports?limit=50`);
        const d = await r.json();
        setReports(d.reports || []);
      }
      if (tab === 'outbreaks') {
        const r = await fetch(`${API}/api/outbreak/summary`);
        const d = await r.json();
        setOutbreaks(d.districts || []);
      }
    } catch { /* offline */ }
    setLoading(false);
  }

  function login() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('afya_admin', 'true');
      setAuthed(true);
    } else {
      setPwError(sw ? 'Nywila si sahihi' : 'Incorrect password');
    }
  }

  function logout() {
    sessionStorage.removeItem('afya_admin');
    setAuthed(false);
    if (onClose) onClose();
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/sms/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg, district: broadcastDistrict, language: broadcastLang })
      });
      const d = await res.json();
      setBroadcastResult(`✓ Sent to ${d.sent || 0} subscribers`);
      setBroadcastMsg('');
    } catch {
      setBroadcastResult('Error: Could not send. Check connection.');
    }
    setSending(false);
    setTimeout(() => setBroadcastResult(''), 4000);
  }

  if (!authed) return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>🔐 {sw ? 'Msimamizi' : 'Admin Login'}</div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          {sw ? 'Weka nywila ya msimamizi' : 'Enter admin password to access the dashboard'}
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Password"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${pwError ? '#ef4444' : '#e5e7eb'}`, fontSize: 14, boxSizing: 'border-box', marginBottom: 4 }} />
        {pwError && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{pwError}</div>}
        <button onClick={login} style={{ width: '100%', padding: 12, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
          {sw ? 'Ingia' : 'Login'}
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: sw ? 'Muhtasari' : 'Overview', icon: '📊' },
    { id: 'subscribers', label: sw ? 'Waandikishaji' : 'Subscribers', icon: '👥' },
    { id: 'reports', label: sw ? 'Ripoti' : 'Reports', icon: '📢' },
    { id: 'outbreaks', label: sw ? 'Milipuko' : 'Outbreaks', icon: '🦠' },
    { id: 'broadcast', label: sw ? 'Tuma SMS' : 'Broadcast', icon: '📲' },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 15, fontWeight: 700 }}>🛡️ {sw ? 'Dashibodi ya Msimamizi' : 'Admin Dashboard'}</div>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginLeft: 28 }}>AfyaHewa Control Center</div>
        </div>
        <button onClick={logout} style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          {sw ? 'Toka' : 'Logout'}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: '0 0 auto', padding: '7px 12px', borderRadius: 8, border: 'none', background: tab === t.id ? '#2563eb' : '#f3f4f6', color: tab === t.id ? '#fff' : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>Loading...</div>}

      {/* OVERVIEW */}
      {tab === 'overview' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: sw ? 'Waandikishaji' : 'Total Subscribers', value: stats.total_subscribers || 0, color: '#2563eb', bg: '#eff6ff', icon: '👥' },
              { label: sw ? 'Ripoti Leo' : 'Reports Today', value: stats.reports_today || 0, color: '#f59e0b', bg: '#fffbeb', icon: '📢' },
              { label: sw ? 'Ukaguzi wa Dalili' : 'Symptom Checks', value: stats.symptom_checks_week || 0, color: '#7c3aed', bg: '#f5f3ff', icon: '🤒' },
              { label: sw ? 'Milipuko Inayoshukiwa' : 'Active Alerts', value: stats.active_outbreaks || 0, color: '#ef4444', bg: '#fef2f2', icon: '🦠' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {stats.top_districts && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{sw ? 'Wilaya Zenye Shughuli Nyingi' : 'Most Active Districts'}</div>
              {stats.top_districts.slice(0, 5).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                  <span style={{ color: '#374151' }}>{d.district}</span>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>{d.reports} {sw ? 'ripoti' : 'reports'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIBERS */}
      {tab === 'subscribers' && (
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
            {subscribers.length} {sw ? 'waandikishaji jumla' : 'total subscribers'}
          </div>
          {subscribers.slice(0, 20).map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500, color: '#111' }}>{s.phone}</div>
                <div style={{ color: '#6b7280', marginTop: 2 }}>{s.district} · {s.language === 'sw' ? 'Swahili' : 'English'}</div>
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>
                {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : '—'}
              </div>
            </div>
          ))}
          {subscribers.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>{sw ? 'Hakuna waandikishaji bado' : 'No subscribers yet'}</div>}
        </div>
      )}

      {/* COMMUNITY REPORTS */}
      {tab === 'reports' && (
        <ReportsPanel reports={reports} sw={sw} API={API} onRefresh={loadData} />
      )}

      {/* OUTBREAKS */}
      {tab === 'outbreaks' && (
        <div>
          {outbreaks.map((o, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${o.risk === 'high' ? '#fecaca' : o.risk === 'medium' ? '#fde68a' : '#bbf7d0'}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.district}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: o.risk === 'high' ? '#fef2f2' : o.risk === 'medium' ? '#fffbeb' : '#f0fdf4', color: o.risk === 'high' ? '#ef4444' : o.risk === 'medium' ? '#f59e0b' : '#22c55e' }}>
                  {o.risk?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {o.report_count} {sw ? 'ripoti wiki hii' : 'reports this week'} · Top: {o.top_symptoms?.join(', ')}
              </div>
              {o.confidence && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Confidence: {Math.round(o.confidence * 100)}%</div>}
            </div>
          ))}
          {outbreaks.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>{sw ? 'Hakuna milipuko inayoshukiwa' : 'No active outbreak alerts'}</div>}
        </div>
      )}

      {/* BROADCAST */}
      {tab === 'broadcast' && (
        <div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: '#92400e' }}>
            ⚠️ {sw ? 'SMS zitatumwa kwa waandikishaji wa wilaya uliyochagua. Hii itaathiri bajeti yako.' : 'SMS will be sent to subscribers in the selected district. This will use your SMS budget.'}
          </div>

          <label style={labelSt}>{sw ? 'Wilaya' : 'District'}</label>
          <select value={broadcastDistrict} onChange={e => setBroadcastDistrict(e.target.value)} style={inputSt}>
            <option value="ALL">{sw ? 'Wilaya Zote' : 'All Districts'}</option>
            {['Arusha','Dar es Salaam','Dodoma','Iringa','Mwanza','Arusha','Mbeya','Tanga','Zanzibar West'].map(d => <option key={d}>{d}</option>)}
          </select>

          <label style={{ ...labelSt, marginTop: 10 }}>{sw ? 'Lugha' : 'Language'}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[{ v: 'en', l: 'English' }, { v: 'sw', l: 'Swahili' }, { v: 'both', l: 'Both' }].map(x => (
              <button key={x.v} onClick={() => setBroadcastLang(x.v)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', background: broadcastLang === x.v ? '#2563eb' : '#f3f4f6', color: broadcastLang === x.v ? '#fff' : '#374151', fontSize: 12, cursor: 'pointer' }}>
                {x.l}
              </button>
            ))}
          </div>

          <label style={labelSt}>{sw ? 'Ujumbe' : 'Message'}</label>
          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value.slice(0, 160))}
            placeholder={sw ? 'Andika ujumbe hapa...' : 'Type your message here...'}
            rows={4} style={{ ...inputSt, resize: 'none' }} />
          <div style={{ fontSize: 11, color: broadcastMsg.length > 140 ? '#f59e0b' : '#9ca3af', textAlign: 'right', marginBottom: 10 }}>
            {broadcastMsg.length}/160 {sw ? 'herufi' : 'characters'}
          </div>

          {broadcastResult && (
            <div style={{ background: broadcastResult.startsWith('✓') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${broadcastResult.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: broadcastResult.startsWith('✓') ? '#166534' : '#ef4444' }}>
              {broadcastResult}
            </div>
          )}

          <button onClick={sendBroadcast} disabled={sending || !broadcastMsg.trim()}
            style={{ width: '100%', padding: 12, background: sending || !broadcastMsg.trim() ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {sending ? (sw ? 'Inatuma...' : 'Sending...') : (sw ? '📲 Tuma SMS' : '📲 Send Broadcast')}
          </button>
        </div>
      )}
    </div>
  );
}

const labelSt = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const inputSt = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', background: '#fff', marginBottom: 0 };

// ── Reports Panel with Accept/Decline ────────────────────────────────────────
function ReportsPanel({ reports, sw, API, onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState({});
  const [updating, setUpdating] = useState({});
  const [localStatus, setLocalStatus] = useState({});

  async function updateStatus(reportId, status, adminNote) {
    setUpdating(p => ({ ...p, [reportId]: true }));
    try {
      await fetch(`${API}/api/community/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, status, admin_note: adminNote || '' })
      });
      setLocalStatus(p => ({ ...p, [reportId]: { status, admin_note: adminNote || '' } }));
      setExpanded(null);
    } catch { alert('Failed to update. Check connection.'); }
    setUpdating(p => ({ ...p, [reportId]: false }));
  }

  const statusColors = {
    under_review: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Under Review' },
    accepted:     { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'Accepted' },
    declined:     { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', label: 'Declined' },
  };

  if (reports.length === 0) return (
    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
      {sw ? 'Hakuna ripoti bado' : 'No community reports yet'}
    </div>
  );

  return (
    <div>
      {reports.map((r, i) => {
        const current = localStatus[r.id] || { status: r.status || 'under_review', admin_note: r.admin_note || '' };
        const sc = statusColors[current.status] || statusColors.under_review;
        const isExpanded = expanded === i;

        return (
          <div key={i} style={{ background: '#fff', border: `1px solid ${sc.border}`, borderRadius: 10, padding: 12, marginBottom: 10, borderLeft: `4px solid ${sc.color}` }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {r.type?.replace(/_/g, ' ').replace(/\w/g, c => c.toUpperCase())}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  📍 {[r.region, r.district, r.street].filter(Boolean).join(' › ')} · {new Date(r.timestamp).toLocaleString()}
                </div>
                {r.id && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>ID: {r.id}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: r.severity === 'high' ? '#fef2f2' : r.severity === 'medium' ? '#fffbeb' : '#f0fdf4', color: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                  {r.severity}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600 }}>
                  {sc.label}
                </span>
              </div>
            </div>

            {/* Details */}
            {r.details && (
              <div style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', marginBottom: 6 }}>"{r.details}"</div>
            )}

            {/* Admin note already set */}
            {current.admin_note && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, fontSize: 11, color: '#6b7280' }}>
                📝 {current.admin_note}
              </div>
            )}

            {/* Action buttons — only show if report has an ID and not yet actioned */}
            {r.id && current.status === 'under_review' && (
              <button onClick={() => setExpanded(isExpanded ? null : i)}
                style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', width: '100%', marginTop: 4 }}>
                {isExpanded ? '▲ Close' : '▼ Review this report'}
              </button>
            )}

            {/* Expanded review panel */}
            {isExpanded && (
              <div style={{ marginTop: 10, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#374151', marginBottom: 8, fontWeight: 500 }}>
                  {sw ? 'Ongeza ujumbe (hiari):' : 'Add a note to the reporter (optional):'}
                </div>
                <textarea
                  value={note[r.id] || ''}
                  onChange={e => setNote(p => ({ ...p, [r.id]: e.target.value }))}
                  placeholder={sw ? 'Mfano: Tumepokea ripoti yako na tunachunguza...' : 'e.g. We have received your report and dispatched a team...'}
                  rows={2}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, resize: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => updateStatus(r.id, 'accepted', note[r.id])}
                    disabled={updating[r.id]}
                    style={{ flex: 1, padding: '9px', background: '#166534', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {updating[r.id] ? '...' : '✅ Accept'}
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'declined', note[r.id])}
                    disabled={updating[r.id]}
                    style={{ flex: 1, padding: '9px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {updating[r.id] ? '...' : '❌ Decline'}
                  </button>
                </div>
              </div>
            )}

            {/* Already actioned — allow re-review */}
            {r.id && current.status !== 'under_review' && (
              <button onClick={() => updateStatus(r.id, 'under_review', '')}
                style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginTop: 6 }}>
                ↩ {sw ? 'Rudisha kwa mapitio' : 'Move back to review'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
