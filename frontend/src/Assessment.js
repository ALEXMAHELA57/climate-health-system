import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, MessageCircle, UserSearch } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function Assessment({ lang, assessmentId, onBack, setPage, setAfyaTopic, setCareFilter, setCareView }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/assessments/${assessmentId}`).then(r => r.json()).then(d => {
      if (d.success) { setData(d.assessment); setAnswers(new Array(d.assessment.questions.length).fill(null)); }
    });
  }, [assessmentId]);

  function answer(value) {
    const next = [...answers];
    next[current] = value;
    setAnswers(next);
    if (current < data.questions.length - 1) setCurrent(current + 1);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/assessments/${assessmentId}/submit`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ answers }),
      });
      const d = await res.json();
      if (d.success) setResult(d);
    } catch { /* silent */ }
    setSubmitting(false);
  }

  function askAfya() {
    setAfyaTopic(sw
      ? `Kuelewa matokeo ya ${data.name_sw}: alama ${result.score}/${result.max_score} (${result.band_sw})`
      : `Understanding my ${data.name_en} result: score ${result.score}/${result.max_score} (${result.band})`);
    setPage('symptoms');
  }

  function findExpert() {
    setCareFilter && setCareFilter('mental_health');
    setCareView && setCareView('expert');
    setPage('care');
  }

  if (!data) return <div style={{ padding: 16, textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</div>;

  if (result) {
    return (
      <div style={{ padding: 16 }}>
        {result.crisis_flag && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#991b1b" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>{sw ? 'Tafadhali Soma Hii' : 'Please Read This'}</span>
            </div>
            <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 10 }}>
              {sw
                ? 'Jibu lako linaonyesha unaweza kuwa na mawazo ya kujidhuru. Wewe si peke yako, na msaada upo. Tafadhali wasiliana na mtu unayemuamini au mtaalamu sasa hivi.'
                : "Your answer suggests you may be having thoughts of harming yourself. You are not alone, and support is available. Please reach out to someone you trust or a professional right now."}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
              {sw ? 'Piga simu 112 kwa dharura.' : 'Call 112 for emergencies.'}
            </p>
          </div>
        )}

        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>{sw ? data.name_sw : data.name_en}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: theme.text }}>{result.score}<span style={{ fontSize: 16, color: theme.textFaint }}>/{result.max_score}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', marginTop: 4, textTransform: 'capitalize' }}>{sw ? result.band_sw : result.band}</div>
        </div>

        <button onClick={askAfya} style={{ width: '100%', padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, textAlign: 'left' }}>
          <MessageCircle size={20} color="#166534" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{sw ? 'Elewa Matokeo na Afya AI' : 'Understand the Result with Afya AI'}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>{sw ? 'Nini kinamaanisha na hatua zinazofuata' : "What it means and what's next"}</div>
          </div>
        </button>

        <button onClick={findExpert} style={{ width: '100%', padding: 14, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <UserSearch size={20} color={theme.textMuted} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{sw ? 'Tafuta Mtaalamu' : 'Find a Mental Health Professional'}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>{sw ? 'Piga simu, chat, au weka miadi' : 'Call, chat, or book an appointment'}</div>
          </div>
        </button>
      </div>
    );
  }

  const q = data.questions[current];
  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> {sw ? 'Rudi' : 'Back'}
      </button>

      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{sw ? data.name_sw : data.name_en}</div>
      <div style={{ height: 4, background: theme.border, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((current + 1) / data.questions.length) * 100}%`, background: '#2563eb', transition: 'width 0.2s' }} />
      </div>

      {current === 0 && (
        <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>{sw ? data.instructions_sw : data.instructions_en}</p>
      )}

      <div style={{ fontSize: 11, color: theme.textFaint, marginBottom: 6 }}>{current + 1} / {data.questions.length}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>{sw ? q.sw : q.en}</div>

      {data.options.map(opt => (
        <button key={opt.value} onClick={() => answer(opt.value)}
          style={{ width: '100%', padding: 14, marginBottom: 8, borderRadius: 10, textAlign: 'left', cursor: 'pointer',
            background: answers[current] === opt.value ? '#eff6ff' : theme.card,
            border: `1px solid ${answers[current] === opt.value ? '#2563eb' : theme.border}`,
            color: theme.text, fontSize: 14 }}>
          {sw ? opt.sw : opt.en}
        </button>
      ))}

      {current > 0 && (
        <button onClick={() => setCurrent(current - 1)} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer', padding: 0, marginTop: 8 }}>
          ‹ {sw ? 'Swali lililopita' : 'Previous question'}
        </button>
      )}

      {answeredCount === data.questions.length && (
        <button onClick={submit} disabled={submitting}
          style={{ width: '100%', padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>
          {submitting ? (sw ? 'Inatuma...' : 'Submitting...') : (sw ? 'Ona Matokeo' : 'See Result')}
        </button>
      )}
    </div>
  );
}
