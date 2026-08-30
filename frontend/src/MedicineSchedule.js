import React, { useState } from 'react';
import { Pill, Plus, Trash2, Bell, Clock } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

export default function MedicineSchedule({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [phone, setPhone] = useState('');
  const [reminders, setReminders] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicine_name: '', dosage: '', times: ['08:00'], start_date: new Date().toISOString().slice(0, 10), end_date: '', sms_fallback: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadReminders() {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/medicine/${phone}`);
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch { setReminders([]); }
    setLoading(false);
  }

  function addTimeSlot() { setForm({ ...form, times: [...form.times, '12:00'] }); }
  function updateTime(i, val) { const t = [...form.times]; t[i] = val; setForm({ ...form, times: t }); }
  function removeTime(i) { setForm({ ...form, times: form.times.filter((_, idx) => idx !== i) }); }

  async function submit() {
    if (!phone.trim() || !form.medicine_name.trim() || form.times.length === 0) {
      setError(sw ? 'Tafadhali jaza sehemu zote muhimu' : 'Please fill in all required fields');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/medicine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_phone: phone, language: lang, ...form, end_date: form.end_date || null }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ medicine_name: '', dosage: '', times: ['08:00'], start_date: new Date().toISOString().slice(0, 10), end_date: '', sms_fallback: true });
        loadReminders();
      } else setError(data.error || (sw ? 'Imeshindwa' : 'Failed to save'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function remove(id) {
    await fetch(`${API}/api/medicine/${id}`, { method: 'DELETE' }).catch(() => {});
    loadReminders();
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input placeholder={sw ? 'Nambari yako ya simu' : 'Your phone number'} value={phone} onChange={e => setPhone(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 }} />
        <button onClick={loadReminders} style={{ padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {sw ? 'Tafuta' : 'Load'}
        </button>
      </div>

      {phone.trim() && (
        <button onClick={() => setShowForm(s => !s)}
          style={{ width: '100%', padding: 11, background: showForm ? theme.card : '#f0fdf4', border: `1px solid ${showForm ? theme.border : '#bbf7d0'}`, borderRadius: 10, marginBottom: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: showForm ? theme.textMuted : '#166534' }}>
          <Plus size={15} /> {showForm ? (sw ? 'Ghairi' : 'Cancel') : (sw ? 'Ongeza Dawa Mpya' : 'Add New Medicine')}
        </button>
      )}

      {showForm && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <input placeholder={sw ? 'Jina la dawa' : 'Medicine name'} value={form.medicine_name} onChange={e => setForm({ ...form, medicine_name: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 }} />
          <input placeholder={sw ? 'Kipimo (mfano: 500mg, kidonge 1)' : 'Dosage (e.g. 500mg, 1 tablet)'} value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 }} />

          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>{sw ? 'MUDA WA KUTUMIA' : 'REMINDER TIMES'}</div>
          {form.times.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="time" value={t} onChange={e => updateTime(i, e.target.value)}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 }} />
              {form.times.length > 1 && (
                <button onClick={() => removeTime(i)} style={{ padding: '0 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
                  <Trash2 size={14} color="#ef4444" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addTimeSlot} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12 }}>
            + {sw ? 'Ongeza muda mwingine' : 'Add another time'}
          </button>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: theme.textFaint, marginBottom: 3 }}>{sw ? 'Anza' : 'Start date'}</div>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: theme.textFaint, marginBottom: 3 }}>{sw ? 'Mwisho (si lazima)' : 'End date (optional)'}</div>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13 }} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.textMuted, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.sms_fallback} onChange={e => setForm({ ...form, sms_fallback: e.target.checked })} />
            {sw ? 'Nitumie SMS pia (kwa wakati bila intaneti)' : 'Also send me an SMS reminder (works without internet)'}
          </label>

          {!!error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: '#991b1b' }}>{error}</div>}

          <button onClick={submit} disabled={submitting}
            style={{ width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? (sw ? 'Inahifadhi...' : 'Saving...') : (sw ? 'Hifadhi Ukumbusho' : 'Save Reminder')}
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 20, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>}
      {reminders && reminders.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: 24, color: theme.textFaint, fontSize: 13 }}>{sw ? 'Hakuna ukumbusho bado' : 'No medicine reminders yet'}</div>
      )}
      {reminders && reminders.map(r => (
        <div key={r.reminder_id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={16} color="#2563eb" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{r.medicine_name}</div>
                {!!r.dosage && <div style={{ fontSize: 12, color: theme.textMuted }}>{r.dosage}</div>}
              </div>
            </div>
            <button onClick={() => remove(r.reminder_id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={15} color="#ef4444" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {r.times.map((t, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 99 }}>
                <Clock size={10} /> {t}
              </span>
            ))}
          </div>
          {r.sms_fallback && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#166534', marginTop: 6 }}>
              <Bell size={11} /> {sw ? 'SMS imewashwa' : 'SMS reminders on'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
