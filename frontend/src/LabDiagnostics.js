import React, { useState, useEffect } from 'react';
import { FlaskConical, Droplet, Baby, HeartPulse, TestTube, ChevronRight, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const CATEGORY_ICON = { blood: Droplet, diabetes: FlaskConical, hiv_sti: TestTube, pregnancy: Baby, cholesterol: HeartPulse, kidney_liver: FlaskConical, other: FlaskConical };

export default function LabDiagnostics({ lang, setPage, setAfyaTopic }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const user = JSON.parse(localStorage.getItem('afya_user') || 'null');

  const [view, setView] = useState('browse'); // browse | tests | consent | book | confirmed | mine
  const [categories, setCategories] = useState([]);
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ patient_name: user?.name || '', patient_phone: user?.phone || '', scheduled_date: '' });
  const [confirmedId, setConfirmedId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/lab/categories`).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
    fetch(`${API}/api/lab/labs`).then(r => r.json()).then(d => {
      setLabs(d.labs || []);
      if (d.labs?.length) setSelectedLab(d.labs[0]);
    }).catch(() => {});
  }, []);

  async function openCategory(catId) {
    if (!selectedLab) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/lab/labs/${selectedLab.id}/tests?category=${catId}`);
      const data = await res.json();
      setTests(data.tests || []);
      setView('tests');
    } catch { setTests([]); }
    setLoading(false);
  }

  function selectTest(t) {
    setSelectedTest(t);
    setError(''); setConfirmedId('');
    setView(t.sensitive ? 'consent' : 'book');
  }

  async function submitBooking() {
    if (!form.patient_name.trim() || !form.patient_phone.trim() || !form.scheduled_date) {
      setError(sw ? 'Tafadhali jaza sehemu zote' : 'Please fill in all fields'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/lab/bookings`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ lab_id: selectedLab.id, test_id: selectedTest.id, ...form }),
      });
      const data = await res.json();
      if (data.success) { setConfirmedId(data.booking_id); setView('confirmed'); }
      else setError(data.error || (sw ? 'Imeshindwa' : 'Failed to book'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function loadMine() {
    setLoading(true); setView('mine');
    try {
      const res = await fetch(`${API}/api/lab/bookings/mine`, { headers: authHeaders() });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch { setBookings([]); }
    setLoading(false);
  }

  function explainResult(b) {
    setAfyaTopic(sw
      ? `Kueleza matokeo ya kipimo cha "${b.test_name}": "${b.result_summary}"`
      : `Explaining the "${b.test_name}" lab result: "${b.result_summary}"`);
    setPage('symptoms');
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 };
  const statusStyle = {
    booked: { color: '#d97706', bg: '#fffbeb', label: sw ? 'Imewekwa' : 'Booked' },
    sample_collected: { color: '#2563eb', bg: '#eff6ff', label: sw ? 'Sampuli Imechukuliwa' : 'Sample Collected' },
    results_ready: { color: '#166534', bg: '#f0fdf4', label: sw ? 'Matokeo Tayari' : 'Results Ready' },
    cancelled: { color: '#991b1b', bg: '#fef2f2', label: sw ? 'Imeghairiwa' : 'Cancelled' },
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setView('browse')}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: view !== 'mine' ? '#2563eb' : theme.card, color: view !== 'mine' ? '#fff' : theme.textMuted }}>
          {sw ? 'Tafuta Vipimo' : 'Find Tests'}
        </button>
        <button onClick={loadMine}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: view === 'mine' ? '#2563eb' : theme.card, color: view === 'mine' ? '#fff' : theme.textMuted }}>
          {sw ? 'Miadi Yangu' : 'My Bookings'}
        </button>
      </div>

      {view === 'browse' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {categories.map(c => {
            const Icon = CATEGORY_ICON[c.id] || FlaskConical;
            return (
              <button key={c.id} onClick={() => openCategory(c.id)}
                style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer' }}>
                <Icon size={20} color="#2563eb" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{sw ? c.sw : c.en}</div>
              </button>
            );
          })}
        </div>
      )}

      {view === 'tests' && (
        <div>
          <button onClick={() => setView('browse')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
          {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
          {!loading && tests.map(t => (
            <button key={t.id} onClick={() => selectTest(t)}
              style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{t.name}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>TZS {t.price.toLocaleString()}</div>
              </div>
              <ChevronRight size={16} color={theme.textFaint} />
            </button>
          ))}
        </div>
      )}

      {view === 'consent' && selectedTest && (
        <div>
          <button onClick={() => setView('tests')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertCircle size={18} color="#92400e" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{sw ? 'Kabla ya Kuendelea' : 'Before You Continue'}</span>
            </div>
            <p style={{ fontSize: 13, color: '#92400e', marginBottom: 10 }}>
              {sw
                ? 'Kipimo hiki ni cha siri. Matokeo yanaweza kuathiri hisia zako. Msaada wa kitaalamu unapatikana kabla na baada ya kipimo, wakati wowote unaohitajika.'
                : "This test is confidential. Results can carry real emotional weight. Professional support is available before and after testing, whenever you need it."}
            </p>
            <p style={{ fontSize: 13, color: '#92400e' }}>
              {sw ? 'Kwa kuendelea, unathibitisha umeelewa hili.' : 'By continuing, you confirm you understand this.'}
            </p>
          </div>
          <button onClick={() => setView('book')} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {sw ? 'Naelewa, Endelea' : 'I Understand, Continue'}
          </button>
        </div>
      )}

      {view === 'book' && selectedTest && (
        <div>
          <button onClick={() => setView(selectedTest.sensitive ? 'consent' : 'tests')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{selectedTest.name}</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>{selectedLab?.name} · TZS {selectedTest.price.toLocaleString()}</div>
          </div>
          <input placeholder={sw ? 'Jina kamili' : 'Full name'} value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} style={inputStyle} />
          <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} style={inputStyle} />
          <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitBooking} disabled={submitting} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? (sw ? 'Inatuma...' : 'Booking...') : (sw ? 'Thibitisha Miadi' : 'Confirm Booking')}
          </button>
        </div>
      )}

      {view === 'confirmed' && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 6 }}>{sw ? 'Miadi imewekwa!' : 'Test booked!'}</div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>{sw ? 'Namba ya miadi' : 'Booking ID'}: <b>{confirmedId}</b></div>
          <button onClick={loadMine} style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {sw ? 'Ona Miadi Yangu' : 'View My Bookings'}
          </button>
        </div>
      )}

      {view === 'mine' && (
        <div>
          {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
          {bookings && bookings.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna miadi bado' : 'No bookings yet'}</p>}
          {bookings && bookings.map(b => {
            const s = statusStyle[b.status] || statusStyle.booked;
            return (
              <div key={b.booking_id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{b.test_name}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>{b.lab_name} · {b.scheduled_date}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 99 }}>{s.label}</span>
                </div>
                {b.result_ready && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 12, color: theme.text, marginBottom: 8 }}>{b.result_summary}</div>
                    <button onClick={() => explainResult(b)}
                      style={{ width: '100%', padding: 8, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: b.sensitive ? 8 : 0 }}>
                      <MessageCircle size={13} /> {sw ? 'Eleza kwa Afya AI' : 'Explain with Afya AI'}
                    </button>
                    {b.sensitive && (
                      <div style={{ background: '#eff6ff', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageCircle size={14} color="#2563eb" />
                        <span style={{ fontSize: 12, color: '#1d4ed8' }}>{sw ? 'Ongea na mtaalamu kuhusu matokeo haya' : 'Talk to a professional about this result'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
