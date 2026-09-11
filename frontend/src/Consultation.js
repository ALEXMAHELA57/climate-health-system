import React, { useState, useEffect } from 'react';
import { Stethoscope, Brain, UserRound, Users, Baby, CalendarHeart, Smile, HeartPulse, Sparkles, Apple, HandHeart, Calendar, Clock, MessageCircle, Video, Phone, ChevronRight, CheckCircle2, XCircle, Star, HandCoins, HeartHandshake } from 'lucide-react';
import { API, validateName, validatePhone } from './constants';
import { useTheme } from './ThemeContext';
import Chat from './Chat';

const SPECIALTY_ICON = {
  general: Stethoscope,
  mental_health: Brain,
  male_reproductive: UserRound,
  female_reproductive: Users,
  maternal_health: Baby,
  menstrual_cycle: CalendarHeart,
  dental: Smile,
  cardiology: HeartPulse,
  dermatology: Sparkles,
  nutrition: Apple,
  palliative_care: HandHeart,
};
const SPECIALTY_COLOR = {
  general:              { fg: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  mental_health:        { fg: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  male_reproductive:    { fg: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  female_reproductive:  { fg: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  maternal_health:      { fg: '#c026d3', bg: '#fdf4ff', border: '#f5d0fe' },
  menstrual_cycle:      { fg: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  dental:               { fg: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  cardiology:           { fg: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  dermatology:          { fg: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  nutrition:            { fg: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  palliative_care:      { fg: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};
const TYPE_ICON = { chat: MessageCircle, voice: Phone, video: Video };

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function Consultation({ lang, initialSpecialty, hideTabs, externalView }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const user = JSON.parse(localStorage.getItem('afya_user') || 'null');
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [view, setView] = useState('browse'); // browse | book | my

  useEffect(() => {
    if (externalView && externalView !== view) {
      setView(externalView);
      if (externalView === 'my') loadMyAppointments();
    }
  }, [externalView]);
  const [specialties, setSpecialties] = useState([]);
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [showAllSpecialties, setShowAllSpecialties] = useState(!initialSpecialty);
  const [negotiatingDoctor, setNegotiatingDoctor] = useState(null);
  const [negotiationForm, setNegotiationForm] = useState({ consultation_type: '', proposed_price: '', patient_name: '', patient_phone: '' });
  const [negotiationMsg, setNegotiationMsg] = useState('');

  const [form, setForm] = useState({ for_profile_id: '', patient_name: user?.name || '', patient_phone: user?.phone || '', reason: '', requested_date: '', requested_time: '', consultation_type: 'chat' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedId, setConfirmedId] = useState('');

  const [myAppointments, setMyAppointments] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [ratingAppointment, setRatingAppointment] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratedAppointments, setRatedAppointments] = useState({});

  useEffect(() => { fetch(`${API}/api/consultation/specialties`).then(r => r.json()).then(d => setSpecialties(d.specialties || [])).catch(() => {}); }, []);
  useEffect(() => { fetch(`${API}/api/family/profiles`, { headers: authHeaders() }).then(r => r.json()).then(d => setFamilyProfiles((d.profiles || []).filter(p => !p.is_linked))).catch(() => {}); }, []);
  useEffect(() => {
    if (initialSpecialty) { loadDoctors(initialSpecialty); setShowAllSpecialties(false); }
    else setShowAllSpecialties(true);
  }, [initialSpecialty]);
  useEffect(() => { if (activeSpecialty) loadDoctors(activeSpecialty); }, [affordableOnly]);

  async function loadDoctors(specId) {
    setActiveSpecialty(specId);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/consultation/doctors?specialty=${specId}${affordableOnly ? '&affordable_only=true' : ''}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch { setDoctors([]); }
    setLoading(false);
  }

  async function cancelAppointment(appointmentId) {
    if (!window.confirm(sw ? 'Una uhakika unataka kughairi miadi hii?' : 'Are you sure you want to cancel this appointment?')) return;
    try {
      await fetch(`${API}/api/consultation/appointments/${appointmentId}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status: 'cancelled' }) });
      loadMyAppointments();
    } catch { /* silent */ }
  }

  async function submitRating(appointmentId) {
    if (ratingStars === 0) return;
    const token = localStorage.getItem('afya_token');
    try {
      const res = await fetch(`${API}/api/consultation/appointments/${appointmentId}/rate`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars: ratingStars }),
      });
      const data = await res.json();
      if (data.success) { setRatedAppointments(prev => ({ ...prev, [appointmentId]: ratingStars })); setRatingAppointment(null); setRatingStars(0); }
    } catch { /* silent */ }
  }

  function startNegotiation(doctor) {
    setNegotiatingDoctor(doctor);
    setNegotiationForm({ consultation_type: doctor.consultation_types[0] || 'chat', proposed_price: '', patient_name: '', patient_phone: '' });
    setNegotiationMsg('');
  }

  async function submitNegotiation() {
    if (!negotiationForm.patient_name.trim() || !negotiationForm.patient_phone.trim() || !negotiationForm.proposed_price) {
      setNegotiationMsg(sw ? 'Jaza sehemu zote' : 'Fill in all fields'); return;
    }
    try {
      const res = await fetch(`${API}/api/consultation/negotiate`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ doctor_id: negotiatingDoctor.id, ...negotiationForm, proposed_price: parseFloat(negotiationForm.proposed_price) }),
      });
      const data = await res.json();
      if (data.success) { setNegotiationMsg(sw ? '✓ Ombi limetumwa' : '✓ Request sent'); }
      else setNegotiationMsg(data.error || (sw ? 'Imeshindwa' : 'Failed'));
    } catch { setNegotiationMsg(sw ? 'Hitilafu' : 'Connection error'); }
  }

  function startBooking(doctor) {
    setSelectedDoctor(doctor);
    setForm({ for_profile_id: '', patient_name: user?.name || '', patient_phone: user?.phone || '', reason: '', requested_date: '', requested_time: '', consultation_type: doctor.consultation_types[0] || 'chat' });
    setError(''); setConfirmedId('');
    setView('book');
  }

  async function submitBooking() {
    const nameErr = validateName(form.patient_name, { sw });
    if (nameErr) { setError(nameErr); return; }
    const phoneErr = validatePhone(form.patient_phone, { sw });
    if (phoneErr) { setError(phoneErr); return; }
    if (!form.requested_date || !form.requested_time) {
      setError(sw ? 'Tafadhali chagua tarehe na muda' : 'Please select a date and time');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/consultation/appointments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ doctor_id: selectedDoctor.id, specialty: activeSpecialty, language: lang, ...form, family_profile_id: form.for_profile_id || null }),
      });
      const data = await res.json();
      if (data.success) { setConfirmedId(data.appointment_id); setMyPhone(form.patient_phone); }
      else setError(data.error || (sw ? 'Imeshindwa kuweka miadi' : 'Failed to book appointment'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function loadMyAppointments() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/consultation/appointments/mine`, { headers: authHeaders() });
      const data = await res.json();
      setMyAppointments(data.appointments || []);
      const negRes = await fetch(`${API}/api/consultation/negotiate/mine`, { headers: authHeaders() });
      const negData = await negRes.json();
      setNegotiations(negData.negotiations || []);
    } catch { setMyAppointments([]); }
    setLoading(false);
  }

  async function respondToCounter(negotiationId, action) {
    try {
      await fetch(`${API}/api/consultation/negotiate/${negotiationId}/respond`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ action }),
      });
      loadMyAppointments();
    } catch { /* silent */ }
  }

  const statusStyle = {
    pending:   { color: '#d97706', bg: '#fffbeb', label: sw ? 'Inasubiri' : 'Pending' },
    confirmed: { color: '#2563eb', bg: '#eff6ff', label: sw ? 'Imethibitishwa' : 'Confirmed' },
    completed: { color: '#166534', bg: '#f0fdf4', label: sw ? 'Imekamilika' : 'Completed' },
    cancelled: { color: '#991b1b', bg: '#fef2f2', label: sw ? 'Imeghairiwa' : 'Cancelled' },
  };

  if (activeChat) {
    const token = localStorage.getItem('afya_token');
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
        <Chat lang={lang} appointmentId={activeChat} token={token} senderType="patient" />
      </div>
    );
  }

  if (negotiatingDoctor) {
    const d = negotiatingDoctor;
    const listedPrice = d.prices?.[negotiationForm.consultation_type] || 0;
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setNegotiatingDoctor(null)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{d.name}</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Bei ya sasa' : 'Listed price'}: TZS {listedPrice.toLocaleString()}</div>
        </div>
        <select value={negotiationForm.consultation_type} onChange={e => setNegotiationForm({ ...negotiationForm, consultation_type: e.target.value })}
          style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }}>
          {d.consultation_types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder={sw ? 'Jina lako' : 'Your name'} value={negotiationForm.patient_name} onChange={e => setNegotiationForm({ ...negotiationForm, patient_name: e.target.value })}
          style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
        <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={negotiationForm.patient_phone} onChange={e => setNegotiationForm({ ...negotiationForm, patient_phone: e.target.value })}
          style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
        <input type="number" placeholder={sw ? 'Unapendekeza bei gani? (TZS)' : 'What price would you propose? (TZS)'} value={negotiationForm.proposed_price} onChange={e => setNegotiationForm({ ...negotiationForm, proposed_price: e.target.value })}
          style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
        {!!negotiationMsg && <p style={{ fontSize: 12, color: negotiationMsg.startsWith('✓') ? '#166534' : '#ef4444', marginBottom: 10 }}>{negotiationMsg}</p>}
        <button onClick={submitNegotiation} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {sw ? 'Tuma Ombi' : 'Send Request'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {!hideTabs && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setView('browse'); setSelectedDoctor(null); }}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === 'browse' || view === 'book' ? '#2563eb' : theme.card, color: view === 'browse' || view === 'book' ? '#fff' : theme.textMuted }}>
            {sw ? 'Tafuta Daktari' : 'Find a Doctor'}
          </button>
          <button onClick={() => { setView('my'); setMyAppointments(null); loadMyAppointments(); }}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === 'my' ? '#2563eb' : theme.card, color: view === 'my' ? '#fff' : theme.textMuted }}>
            {sw ? 'Miadi Yangu' : 'My Appointments'}
          </button>
        </div>
      )}

      {view === 'browse' && (
        <>
          <button onClick={() => setAffordableOnly(v => !v)}
            style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: affordableOnly ? '#f0fdf4' : theme.card, border: `1px solid ${affordableOnly ? '#bbf7d0' : theme.border}`, color: affordableOnly ? '#166534' : theme.textMuted, fontSize: 12, fontWeight: 600 }}>
            <HeartHandshake size={14} /> {sw ? 'Onyesha Huduma Nafuu Tu' : 'Show Affordable Care Only'}
          </button>
          {showAllSpecialties ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {specialties.map(s => {
                  const Icon = SPECIALTY_ICON[s.id] || Stethoscope;
                  const c = SPECIALTY_COLOR[s.id] || SPECIALTY_COLOR.general;
                  const active = activeSpecialty === s.id;
                  return (
                    <button key={s.id} onClick={() => { loadDoctors(s.id); setShowAllSpecialties(false); }}
                      style={{ textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer',
                        background: c.bg, border: `1px solid ${active ? c.fg : c.border}`, borderWidth: active ? 2 : 1 }}>
                      <Icon size={20} color={c.fg} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginTop: 6 }}>{sw ? s.sw : s.en}</div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                {specialties.find(s => s.id === activeSpecialty)?.[sw ? 'sw' : 'en'] || (sw ? 'Wataalamu' : 'Experts')}
              </div>
              <button onClick={() => setShowAllSpecialties(true)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {sw ? 'Badilisha Fani' : 'Browse all specialties'}
              </button>
            </div>
          )}

          {loading && <div style={{ textAlign: 'center', padding: 20, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}

          {!loading && activeSpecialty && doctors.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Hakuna daktari kwa sasa' : 'No doctors available right now'}</div>
          )}

          {!loading && doctors.map(d => {
            const c = SPECIALTY_COLOR[d.specialty] || SPECIALTY_COLOR.general;
            return (
              <div key={d.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{d.name}</div>
                  {d.affordable_care && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#166534', background: '#f0fdf4', padding: '2px 8px', borderRadius: 99 }}>
                      <HeartHandshake size={10} /> {sw ? 'Nafuu' : 'Affordable'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: c.fg, fontWeight: 600, margin: '3px 0' }}>{d.specialty_label}</div>
                {d.avg_rating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{d.avg_rating}</span>
                    <span style={{ fontSize: 11, color: theme.textFaint }}>({d.rating_count})</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{d.bio}</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {d.consultation_types.map(t => {
                    const TIcon = TYPE_ICON[t] || MessageCircle;
                    return (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#f3f4f6', padding: '3px 8px', borderRadius: 99, color: '#374151' }}>
                        <TIcon size={11} /> {t} {d.prices?.[t] ? `· TZS ${d.prices[t].toLocaleString()}` : ''}
                      </span>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {d.open_to_negotiation && (
                    <button onClick={() => startNegotiation(d)}
                      style={{ padding: '9px 12px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HandCoins size={13} /> {sw ? 'Jadili' : 'Discuss Fee'}
                    </button>
                  )}
                  <button onClick={() => startBooking(d)}
                    style={{ flex: 1, padding: 9, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {sw ? 'Weka Miadi' : 'Book Appointment'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {!activeSpecialty && <div style={{ textAlign: 'center', padding: 30, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Chagua aina ya huduma hapo juu' : 'Select a specialty above to see doctors'}</div>}
        </>
      )}

      {view === 'book' && selectedDoctor && (
        confirmedId ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 6 }}>{sw ? 'Miadi imewekwa!' : 'Appointment requested!'}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>
              {sw ? 'Namba ya miadi' : 'Appointment ID'}: <b>{confirmedId}</b>
            </div>
            <button onClick={() => { setView('my'); loadMyAppointments(); }}
              style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {sw ? 'Ona Miadi Yangu' : 'View My Appointments'}
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => setView('browse')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{selectedDoctor.name}</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{selectedDoctor.specialty_label}</div>
            </div>

            {familyProfiles.length > 0 && (
              <select value={form.for_profile_id} onChange={e => {
                const fp = familyProfiles.find(p => String(p.id) === e.target.value);
                setForm({ ...form, for_profile_id: e.target.value, patient_name: fp ? fp.name : (user?.name || ''), patient_phone: fp ? (fp.phone || '') : (user?.phone || '') });
              }} style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }}>
                <option value="">{sw ? 'Mimi mwenyewe' : 'Myself'}</option>
                {familyProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            <input placeholder={sw ? 'Jina lako kamili' : 'Your full name'} value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
            <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="date" value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
              <input type="time" value={form.requested_time} onChange={e => setForm({ ...form, requested_time: e.target.value })}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
            </div>
            <select value={form.consultation_type} onChange={e => setForm({ ...form, consultation_type: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }}>
              {selectedDoctor.consultation_types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea placeholder={sw ? 'Eleza sababu ya ushauri (si lazima)' : 'Briefly describe the reason for consultation (optional)'} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14, minHeight: 70 }} />

            {!!error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: '#991b1b' }}>{error}</div>}

            <button onClick={submitBooking} disabled={submitting}
              style={{ width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? (sw ? 'Inatuma...' : 'Submitting...') : (sw ? 'Thibitisha Miadi' : 'Confirm Appointment')}
            </button>
          </div>
        )
      )}

      {view === 'my' && (
        <div>
          {loading && <div style={{ textAlign: 'center', padding: 20, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}

          {negotiations.filter(n => n.status === 'countered').length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8 }}>{sw ? 'OFA ZA BEI' : 'FEE COUNTER-OFFERS'}</p>
              {negotiations.filter(n => n.status === 'countered').map(n => (
                <div key={n.negotiation_id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>
                    {sw ? `${n.doctor_name} amependekeza TZS ${n.counter_price?.toLocaleString()} badala ya TZS ${n.proposed_price.toLocaleString()} ulizopendekeza`
                        : `${n.doctor_name} countered with TZS ${n.counter_price?.toLocaleString()} (you proposed TZS ${n.proposed_price.toLocaleString()})`}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => respondToCounter(n.negotiation_id, 'accept')} style={{ flex: 1, padding: 8, background: '#166534', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {sw ? 'Kubali' : 'Accept'}
                    </button>
                    <button onClick={() => respondToCounter(n.negotiation_id, 'decline')} style={{ flex: 1, padding: 8, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {sw ? 'Kataa' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myAppointments && myAppointments.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Hakuna miadi bado' : 'No appointments yet'}</div>}
          {myAppointments && myAppointments.map(a => {
            const s = statusStyle[a.status] || statusStyle.pending;
            return (
              <div key={a.appointment_id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{a.doctor_name}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>{a.specialty_label}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 99 }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: theme.textMuted, marginTop: 8 }}>
                  <Calendar size={12} /> {a.requested_date} <Clock size={12} style={{ marginLeft: 6 }} /> {a.requested_time}
                </div>
                {a.status !== 'cancelled' && (
                  <button onClick={() => setActiveChat(a.appointment_id)}
                    style={{ width: '100%', marginTop: 10, padding: 8, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <MessageCircle size={13} /> {sw ? 'Ongea na Daktari' : 'Chat with Doctor'}
                  </button>
                )}
                {(a.status === 'pending' || a.status === 'confirmed') && (
                  <button onClick={() => cancelAppointment(a.appointment_id)}
                    style={{ width: '100%', marginTop: 6, padding: 8, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#991b1b' }}>
                    {sw ? 'Ghairi Miadi' : 'Cancel Appointment'}
                  </button>
                )}
                {a.status === 'completed' && !ratedAppointments[a.appointment_id] && (
                  ratingAppointment === a.appointment_id ? (
                    <div style={{ marginTop: 10, padding: 10, background: theme.bg, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setRatingStars(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <Star size={22} color="#f59e0b" fill={n <= ratingStars ? '#f59e0b' : 'none'} />
                          </button>
                        ))}
                      </div>
                      <button onClick={() => submitRating(a.appointment_id)} style={{ width: '100%', padding: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {sw ? 'Tuma' : 'Submit'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setRatingAppointment(a.appointment_id); setRatingStars(0); }}
                      style={{ width: '100%', marginTop: 8, padding: 8, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: theme.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Star size={13} /> {sw ? 'Kadiria Daktari' : 'Rate this Doctor'}
                    </button>
                  )
                )}
                {ratedAppointments[a.appointment_id] && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#166534', textAlign: 'center' }}>✓ {sw ? 'Umekadiria' : 'Rated'} {ratedAppointments[a.appointment_id]}★</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
