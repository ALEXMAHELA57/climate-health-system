import React, { useState, useEffect } from 'react';
import { Stethoscope, Brain, UserRound, Users, Baby, CalendarHeart, Smile, HeartPulse, Sparkles, Apple, HandHeart, Calendar, Clock, MessageCircle, Video, Phone, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

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

export default function Consultation({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [view, setView] = useState('browse'); // browse | book | my
  const [specialties, setSpecialties] = useState([]);
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [form, setForm] = useState({ patient_name: '', patient_phone: '', reason: '', requested_date: '', requested_time: '', consultation_type: 'chat' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedId, setConfirmedId] = useState('');

  const [myPhone, setMyPhone] = useState('');
  const [myAppointments, setMyAppointments] = useState(null);

  useEffect(() => { fetch(`${API}/api/consultation/specialties`).then(r => r.json()).then(d => setSpecialties(d.specialties || [])).catch(() => {}); }, []);

  async function loadDoctors(specId) {
    setActiveSpecialty(specId);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/consultation/doctors?specialty=${specId}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch { setDoctors([]); }
    setLoading(false);
  }

  function startBooking(doctor) {
    setSelectedDoctor(doctor);
    setForm({ patient_name: '', patient_phone: '', reason: '', requested_date: '', requested_time: '', consultation_type: doctor.consultation_types[0] || 'chat' });
    setError(''); setConfirmedId('');
    setView('book');
  }

  async function submitBooking() {
    if (!form.patient_name.trim() || !form.patient_phone.trim() || !form.requested_date || !form.requested_time) {
      setError(sw ? 'Tafadhali jaza sehemu zote muhimu' : 'Please fill in all required fields');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/consultation/appointments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: selectedDoctor.id, specialty: activeSpecialty, language: lang, ...form }),
      });
      const data = await res.json();
      if (data.success) { setConfirmedId(data.appointment_id); setMyPhone(form.patient_phone); }
      else setError(data.error || (sw ? 'Imeshindwa kuweka miadi' : 'Failed to book appointment'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function loadMyAppointments() {
    if (!myPhone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/consultation/appointments/${myPhone}`);
      const data = await res.json();
      setMyAppointments(data.appointments || []);
    } catch { setMyAppointments([]); }
    setLoading(false);
  }

  const statusStyle = {
    pending:   { color: '#d97706', bg: '#fffbeb', label: sw ? 'Inasubiri' : 'Pending' },
    confirmed: { color: '#2563eb', bg: '#eff6ff', label: sw ? 'Imethibitishwa' : 'Confirmed' },
    completed: { color: '#166534', bg: '#f0fdf4', label: sw ? 'Imekamilika' : 'Completed' },
    cancelled: { color: '#991b1b', bg: '#fef2f2', label: sw ? 'Imeghairiwa' : 'Cancelled' },
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => { setView('browse'); setSelectedDoctor(null); }}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: view === 'browse' || view === 'book' ? '#2563eb' : theme.card, color: view === 'browse' || view === 'book' ? '#fff' : theme.textMuted }}>
          {sw ? 'Tafuta Daktari' : 'Find a Doctor'}
        </button>
        <button onClick={() => { setView('my'); setMyAppointments(null); }}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: view === 'my' ? '#2563eb' : theme.card, color: view === 'my' ? '#fff' : theme.textMuted }}>
          {sw ? 'Miadi Yangu' : 'My Appointments'}
        </button>
      </div>

      {view === 'browse' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {specialties.map(s => {
              const Icon = SPECIALTY_ICON[s.id] || Stethoscope;
              const c = SPECIALTY_COLOR[s.id] || SPECIALTY_COLOR.general;
              const active = activeSpecialty === s.id;
              return (
                <button key={s.id} onClick={() => loadDoctors(s.id)}
                  style={{ textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer',
                    background: c.bg, border: `1px solid ${active ? c.fg : c.border}`, borderWidth: active ? 2 : 1 }}>
                  <Icon size={20} color={c.fg} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginTop: 6 }}>{sw ? s.sw : s.en}</div>
                </button>
              );
            })}
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 20, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}

          {!loading && activeSpecialty && doctors.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Hakuna daktari kwa sasa' : 'No doctors available right now'}</div>
          )}

          {!loading && doctors.map(d => {
            const c = SPECIALTY_COLOR[d.specialty] || SPECIALTY_COLOR.general;
            return (
              <div key={d.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{d.name}</div>
                <div style={{ fontSize: 12, color: c.fg, fontWeight: 600, margin: '3px 0' }}>{d.specialty_label}</div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{d.bio}</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {d.consultation_types.map(t => {
                    const TIcon = TYPE_ICON[t] || MessageCircle;
                    return (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#f3f4f6', padding: '3px 8px', borderRadius: 99, color: '#374151' }}>
                        <TIcon size={11} /> {t}
                      </span>
                    );
                  })}
                </div>
                <button onClick={() => startBooking(d)}
                  style={{ width: '100%', padding: 9, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {sw ? 'Weka Miadi' : 'Book Appointment'} <ChevronRight size={14} />
                </button>
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input placeholder={sw ? 'Weka nambari yako ya simu' : 'Enter your phone number'} value={myPhone} onChange={e => setMyPhone(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
            <button onClick={loadMyAppointments} style={{ padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {sw ? 'Tafuta' : 'Search'}
            </button>
          </div>
          {loading && <div style={{ textAlign: 'center', padding: 20, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
