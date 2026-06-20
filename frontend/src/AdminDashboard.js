import React, { useState, useEffect } from 'react';

const API = 'https://climate-health-system-backend.onrender.com';

const ALL_REGIONS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
  'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songea','Tabora','Tanga',
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South'
];

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
  const [severeReports, setSevereReports] = useState([]);
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
      if (tab === 'urgent') {
        const r = await fetch(`${API}/api/symptoms/severe`);
        const d = await r.json();
        setSevereReports(d.reports || []);
      }
    } catch { /* offline */ }
    setLoading(false);
  }

  async function dismissSevere(reportId) {
    try {
      await fetch(`${API}/api/symptoms/${reportId}/dismiss`, { method: 'POST' });
      setSevereReports(prev => prev.filter(r => r.id !== reportId));
    } catch {}
  }

  async function deleteSymptomReport(reportId) {
    if (!window.confirm(sw ? 'Una uhakika unataka kufuta ripoti hii?' : 'Are you sure you want to delete this report?')) return;
    try {
      await fetch(`${API}/api/symptoms/${reportId}`, { method: 'DELETE' });
      setSevereReports(prev => prev.filter(r => r.id !== reportId));
    } catch {}
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
    { id: 'urgent', label: sw ? 'Dharura' : 'Urgent', icon: '🚨' },
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
              { label: sw ? 'Waandikishaji' : 'Total Subscribers', value: stats.total_subscribers || 0, color: '#2563eb', bg: '#eff6ff', icon: '👥', tab: 'subscribers' },
              { label: sw ? 'Ripoti Leo' : 'Reports Today', value: stats.reports_today || 0, color: '#f59e0b', bg: '#fffbeb', icon: '📢', tab: 'reports' },
              { label: sw ? 'Ukaguzi wa Dalili' : 'Symptom Checks', value: stats.symptom_checks_week || 0, color: '#7c3aed', bg: '#f5f3ff', icon: '🤒', tab: null },
              { label: sw ? 'Milipuko Iliyoidhinishwa' : 'Active Alerts', value: stats.active_outbreaks || 0, color: '#ef4444', bg: '#fef2f2', icon: '🦠', tab: 'outbreaks' },
            ].map((s, i) => (
              <button key={i} onClick={() => s.tab && setTab(s.tab)}
                style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: 12, textAlign: 'left', cursor: s.tab ? 'pointer' : 'default' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
              </button>
            ))}
          </div>

          {stats.pending_outbreaks > 0 && (
            <button onClick={() => setTab('outbreaks')}
              style={{ width: '100%', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 12, color: '#92400e' }}>
                ⏳ {sw
                  ? `Milipuko ${stats.pending_outbreaks} inasubiri idhini yako`
                  : `${stats.pending_outbreaks} outbreak${stats.pending_outbreaks > 1 ? 's' : ''} awaiting your approval`}
              </span>
              <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>{sw ? 'Angalia →' : 'Review →'}</span>
            </button>
          )}

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

      {/* URGENT — severe symptom signals needing human review */}
      {tab === 'urgent' && (
        <div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
            {sw
              ? 'Ripoti hizi zina dalili kali zinazohitaji ufuatiliaji wa haraka na mamlaka ya afya. Hii si uchunguzi wa ugonjwa maalum — ni tahadhari tu.'
              : 'These reports contain severe signals requiring prompt review by health authorities. This is not a specific disease diagnosis — only a safety flag for human follow-up.'}
          </div>
          {severeReports.map((r) => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.region || (sw ? 'Haijulikani' : 'Unknown region')}</div>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(r.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>{r.symptoms}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => dismissSevere(r.id)}
                  style={{ flex: 1, padding: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ {sw ? 'Si Dharura' : 'Not Urgent'}
                </button>
                <button onClick={() => deleteSymptomReport(r.id)}
                  style={{ flex: 1, padding: '6px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  🗑 {sw ? 'Futa' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
          {severeReports.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
              {sw ? 'Hakuna ripoti za dharura kwa sasa' : 'No urgent reports at this time'}
            </div>
          )}
        </div>
      )}

      {/* COMMUNITY REPORTS */}
      {tab === 'reports' && (
        <ReportsPanel reports={reports} sw={sw} API={API} onRefresh={loadData} />
      )}

      {/* OUTBREAKS — approval queue */}
      {tab === 'outbreaks' && (
        <OutbreakQueuePanel sw={sw} API={API} />
      )}

      {/* BROADCAST */}
      {tab === 'broadcast' && (
        <div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: '#92400e' }}>
            ⚠️ {sw ? 'SMS zitatumwa kwa waandikishaji wa wilaya uliyochagua. Hii itaathiri bajeti yako.' : 'SMS will be sent to subscribers in the selected district. This will use your SMS budget.'}
          </div>

          <label style={labelSt}>{sw ? 'Mkoa' : 'Region'}</label>
          <select value={broadcastDistrict} onChange={e => setBroadcastDistrict(e.target.value)} style={inputSt}>
            <option value="ALL">{sw ? 'Mikoa Yote' : 'All Regions'}</option>
            {ALL_REGIONS.map(d => <option key={d}>{d}</option>)}
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
  const [deleted, setDeleted] = useState({});

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

  async function deleteReport(reportId) {
    if (!window.confirm(sw ? 'Una uhakika unataka kufuta ripoti hii kabisa? Hatua hii haiwezi kutenduliwa.' : 'Permanently delete this report? This cannot be undone.')) return;
    setUpdating(p => ({ ...p, [reportId]: true }));
    try {
      await fetch(`${API}/api/community/report/${reportId}`, { method: 'DELETE' });
      setDeleted(p => ({ ...p, [reportId]: true }));
    } catch { alert('Failed to delete. Check connection.'); }
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
        if (deleted[r.id]) return null;
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
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={() => setExpanded(isExpanded ? null : i)}
                  style={{ flex: 1, fontSize: 11, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                  {isExpanded ? '▲ Close' : '▼ Review this report'}
                </button>
                <button onClick={() => deleteReport(r.id)} disabled={updating[r.id]}
                  style={{ fontSize: 11, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                  🗑
                </button>
              </div>
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

            {/* Already actioned — allow re-review or delete */}
            {r.id && current.status !== 'under_review' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => updateStatus(r.id, 'under_review', '')}
                  style={{ flex: 1, fontSize: 11, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  ↩ {sw ? 'Rudisha kwa mapitio' : 'Move back to review'}
                </button>
                <button onClick={() => deleteReport(r.id)} disabled={updating[r.id]}
                  style={{ fontSize: 11, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  🗑 {sw ? 'Futa' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Outbreak Queue Panel — auto-publish toggle + approve/reject ──────────────

// ── Outbreak Queue Panel ─────────────────────────────────────────────────────
// Three sections: Pending (decide), Approved (can revert anytime),
// Rejected (visible 3 days then auto-hidden and locked)
function OutbreakQueuePanel({ sw, API }) {
  const [autoPublish, setAutoPublish] = useState(false);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [section, setSection] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [actioning, setActioning] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, queueRes] = await Promise.all([
        fetch(`${API}/api/outbreak/settings`),
        fetch(`${API}/api/outbreak/queue`),
      ]);
      const settings = await settingsRes.json();
      const queue = await queueRes.json();
      setAutoPublish(!!settings.auto_publish_outbreaks);
      setPending(queue.pending || []);
      setApproved(queue.approved || []);
      setRejected(queue.rejected || []);
    } catch {}
    setLoading(false);
  }

  async function toggleAutoPublish() {
    const newValue = !autoPublish;
    setSavingToggle(true);
    try {
      await fetch(`${API}/api/outbreak/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_publish_outbreaks: newValue }),
      });
      setAutoPublish(newValue);
    } catch {}
    setSavingToggle(false);
  }

  async function runAction(id, endpoint) {
    setActioning(p => ({ ...p, [id]: true }));
    try {
      await fetch(`${API}/api/outbreak/alert/${id}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      await load(); // refresh all three lists so item moves between sections
    } catch {}
    setActioning(p => ({ ...p, [id]: false }));
  }

  const riskColors = {
    emergency: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    high:      { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    medium:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    low:       { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  };

  function formatHoursLeft(hours) {
    if (hours <= 0) return sw ? 'inaisha sasa' : 'expiring now';
    if (hours < 1) return sw ? `dakika ${Math.round(hours * 60)}` : `${Math.round(hours * 60)} min left`;
    const h = Math.floor(hours);
    return sw ? `saa ${h} zimebaki` : `${h}h left`;
  }

  const sections = [
    { id: 'pending', label: sw ? 'Inasubiri' : 'Pending', count: pending.length, icon: '⏳' },
    { id: 'approved', label: sw ? 'Imeidhinishwa' : 'Approved', count: approved.length, icon: '✅' },
    { id: 'rejected', label: sw ? 'Imekataliwa' : 'Rejected', count: rejected.length, icon: '❌' },
  ];

  const activeList = section === 'pending' ? pending : section === 'approved' ? approved : rejected;

  return (
    <div>
      {/* Auto-publish toggle */}
      <div style={{ background: autoPublish ? '#fffbeb' : '#f0fdf4', border: `1px solid ${autoPublish ? '#fde68a' : '#bbf7d0'}`, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, marginRight: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
            {sw ? 'Chapisha Kiotomatiki' : 'Auto-Publish Outbreaks'}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {autoPublish
              ? (sw ? 'Milipuko inaonekana kwa watumiaji mara moja, bila idhini' : 'Outbreaks appear to users instantly, no approval needed')
              : (sw ? 'Milipuko inahitaji idhini yako kabla ya kuonekana' : 'Outbreaks require your approval before appearing publicly')}
          </div>
        </div>
        <button onClick={toggleAutoPublish} disabled={savingToggle}
          style={{ width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: autoPublish ? '#f59e0b' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: autoPublish ? 23 : 3, transition: 'left 0.15s' }} />
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', background: section === s.id ? '#2563eb' : '#f3f4f6', color: section === s.id ? '#fff' : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {s.icon} {s.label} ({s.count})
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}

      {!loading && activeList.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
          {section === 'pending' && (autoPublish
            ? (sw ? 'Uchapishaji wa kiotomatiki umewashwa — hakuna foleni' : 'Auto-publish is on — no queue needed')
            : (sw ? 'Hakuna milipuko inayosubiri idhini' : 'No outbreaks waiting for approval'))}
          {section === 'approved' && (sw ? 'Hakuna milipuko iliyoidhinishwa' : 'No approved outbreaks')}
          {section === 'rejected' && (sw ? 'Hakuna milipuko iliyokataliwa hivi karibuni' : 'No recently rejected outbreaks')}
        </div>
      )}

      {!loading && activeList.map((p) => {
        const rc = riskColors[p.risk] || riskColors.low;
        return (
          <div key={p.id} style={{ background: '#fff', border: `1px solid ${rc.border}`, borderLeft: `4px solid ${rc.color}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.region}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: rc.bg, color: rc.color }}>
                {p.risk?.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{p.disease}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
              {p.reports_3day} {sw ? 'ripoti siku 3' : 'reports (3d)'} · {p.reports_7day} {sw ? 'ripoti siku 7' : 'reports (7d)'} · {Math.round(p.confidence * 100)}% {sw ? 'uwezekano' : 'confidence'}
            </div>

            {/* Rejected — show countdown */}
            {section === 'rejected' && p.hours_left !== undefined && (
              <div style={{ fontSize: 11, color: '#991b1b', background: '#fef2f2', borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
                ⏱ {sw ? 'Itatoweka baada ya' : 'Disappears in'} {formatHoursLeft(p.hours_left)} — {sw ? 'baada ya hapo haitaweza kubadilishwa' : 'after that it cannot be changed'}
              </div>
            )}

            {/* Action buttons per section */}
            {section === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => runAction(p.id, 'approve')} disabled={actioning[p.id]}
                  style={{ flex: 1, padding: '8px', background: '#166534', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {actioning[p.id] ? '...' : `✅ ${sw ? 'Idhinisha' : 'Approve'}`}
                </button>
                <button onClick={() => runAction(p.id, 'reject')} disabled={actioning[p.id]}
                  style={{ flex: 1, padding: '8px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {actioning[p.id] ? '...' : `❌ ${sw ? 'Kataa' : 'Reject'}`}
                </button>
              </div>
            )}

            {section === 'approved' && (
              <button onClick={() => runAction(p.id, 'unapprove')} disabled={actioning[p.id]}
                style={{ width: '100%', padding: '8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {actioning[p.id] ? '...' : `↩ ${sw ? 'Tengua Idhini' : 'Undo Approval'}`}
              </button>
            )}

            {section === 'rejected' && (
              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '4px 0' }}>
                {sw ? 'Hakuna hatua zinazoweza kuchukuliwa kwa sasa' : 'No actions available'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
