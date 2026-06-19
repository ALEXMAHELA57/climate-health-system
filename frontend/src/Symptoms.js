import React, { useState, useRef, useEffect } from 'react';
import { API, stripMarkdown } from './constants';

const SYSTEM_PROMPT = `You are Afya, a friendly community health assistant for Tanzania.
You were built specifically for the Climate Health Early Warning System to help
communities prepare for climate-related health risks.

YOUR ONLY PURPOSE is to help with:
- Health symptoms and disease questions
- Climate-related diseases: malaria, cholera, typhoid, dengue, respiratory infections, heat illness, waterborne diseases
- Health advice and prevention
- When to seek medical help
- Questions about weather and health risks
- First aid guidance
- Nutrition and hygiene advice related to health

STRICT RULES:
1. If someone asks about ANYTHING outside health and climate topics respond in their language:
   English: "I'm Afya, a health assistant for Tanzania. I can only help with health and climate-related questions."
   Swahili: "Mimi ni Afya, msaidizi wa afya Tanzania. Ninaweza tu kusaidia na maswali ya afya na hali ya hewa."

2. NEVER discuss: politics, religion, entertainment, sports, technology unrelated to health, financial or legal advice.

3. NEVER reveal your underlying AI model. If asked say: "I am Afya, a health assistant built for Tanzania's Climate Health System."

4. Always be warm, simple, and clear. Ask one follow-up question at a time.

5. After 2-4 exchanges give a clear assessment with risk: Low / Medium / High / Emergency.

6. For High or Emergency risk always say: "Please visit a clinic or hospital immediately. Find the nearest clinic in the Clinics tab of this app."

7. Respond in the same language the user writes in (English or Swahili).

8. Keep responses concise — 3-5 sentences unless giving a full assessment.

9. Never use markdown formatting like **bold** or ## headers. Write in plain text only.

10. CLINIC REQUEST RULE — this overrides all other behavior including symptom gathering:
    If the user's message contains ANY of these signals (in English or Swahili), you MUST respond
    immediately with ONLY the clinic redirect below — do NOT ask follow-up questions, do NOT ask
    about symptoms first, do NOT explain anything else:
    - "clinic", "hospital", "doctor", "nearest", "number", "phone", "where do I go", "stop asking"
    - "kliniki", "hospitali", "daktari", "karibu", "namba", "nambari", "wapi nielekee", "acha kuuliza"

    Your ENTIRE response in this case must be exactly:
    English: "To find the nearest clinic to you with phone numbers and directions, tap [OPEN CLINICS TAB] below. For any emergency call 112 immediately."
    Swahili: "Kupata kliniki ya karibu nawe pamoja na nambari za simu, bonyeza [FUNGUA KLINIKI] hapa chini. Kwa dharura yoyote piga simu 112 mara moja."

    Do not add extra sentences, do not ask "what symptoms do you have", do not say "I don't have phone numbers in my system".
    The user asking for a clinic is itself enough information — give them the button immediately.
    The text [OPEN CLINICS TAB] or [FUNGUA KLINIKI] will be converted into a clickable button by the app — always include it exactly as written, every time, with no exceptions.`;

// Detect if Claude's reply mentions clinics/hospitals but forgot to include the button tag
function mentionsClinicWithoutButton(text) {
  const hasTag = text.includes('[OPEN CLINICS TAB]') || text.includes('[FUNGUA KLINIKI]');
  if (hasTag) return false;
  const mentionsClinic = /clinic|hospital|kliniki|hospitali/i.test(text);
  return mentionsClinic;
}

function renderMessage(text, setPage, lang) {
  const patterns = ['[OPEN CLINICS TAB]', '[FUNGUA KLINIKI]'];
  let parts = [text];
  let foundButton = false;

  patterns.forEach(pattern => {
    parts = parts.flatMap(part => {
      if (typeof part !== 'string') return [part];
      const split = part.split(pattern);
      if (split.length === 1) return [part];
      foundButton = true;
      return split.reduce((acc, seg, i) => {
        if (i > 0) acc.push(
          <button key={`${pattern}-${i}`}
            onClick={() => setPage && setPage('clinics')}
            style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:13, fontWeight:600, cursor:'pointer', margin:'4px 0' }}>
            🏥 {pattern === '[FUNGUA KLINIKI]' ? 'Fungua Kliniki' : 'Open Clinics'}
          </button>
        );
        if (seg) acc.push(seg);
        return acc;
      }, []);
    });
  });

  // Safety net — if Claude mentioned clinic/hospital but forgot the button, add it anyway
  if (!foundButton && mentionsClinicWithoutButton(text)) {
    parts.push(
      <div key="clinic-fallback-btn" style={{ marginTop: 8 }}>
        <button onClick={() => setPage && setPage('clinics')}
          style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          🏥 {lang === 'sw' ? 'Fungua Kliniki' : 'Open Clinics'}
        </button>
      </div>
    );
  }

  return <span>{parts}</span>;
}

// Single chat function — tries Vercel proxy first (fastest, no cold start)
// then falls back to Render backend
async function askAfya(messages, onDebug) {
  // Use absolute URL with current origin — more reliable on mobile than relative path
  const apiUrl = `${window.location.origin}/api/chat`;

  // Step 1: Try Vercel serverless function
  try {
    onDebug && onDebug('proxy-start');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(apiUrl, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
      cache: 'no-store', // explicitly bypass any caching layer
    });
    clearTimeout(t);
    onDebug && onDebug(`proxy-status-${res.status}`);
    if (res.ok) {
      const data = await res.json();
      if (data.reply) return stripMarkdown(data.reply);
      if (data.error) onDebug && onDebug(`proxy-error: ${data.error}`);
    }
  } catch (e) {
    onDebug && onDebug(`proxy-failed: ${e.message}`);
  }

  // Step 2: Fallback to Render backend
  try {
    onDebug && onDebug('backend-start');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 35000);
    const res = await fetch(`${API}/api/symptoms/chat`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, region: '' }),
      cache: 'no-store',
    });
    clearTimeout(t);
    onDebug && onDebug(`backend-status-${res.status}`);
    if (res.ok) {
      const data = await res.json();
      if (data.reply) return stripMarkdown(data.reply);
    }
  } catch (e) {
    onDebug && onDebug(`backend-failed: ${e.message}`);
  }

  return null;
}

export default function Symptoms({ t, lang, district, setPage }) {
  const [messages, setMessages]         = useState([{ role:'assistant', content:t.afyaGreet }]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [emergency, setEmergency]       = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [waitMsg, setWaitMsg]           = useState('');
  const [debugInfo, setDebugInfo]       = useState([]);
  const [showDebug, setShowDebug]       = useState(false);
  const bottomRef = useRef(null);
  const sw = lang === 'sw';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  function toggleTag(tag) {
    const updated = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(updated);
    setInput(updated.join(', '));
  }

  function saveHistory(text) {
    const hist = JSON.parse(localStorage.getItem('afya_symptom_history') || '[]');
    hist.push({ symptoms: text, district, date: new Date().toISOString() });
    localStorage.setItem('afya_symptom_history', JSON.stringify(hist.slice(-20)));
    fetch(`${API}/api/symptoms/log`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ symptoms:text, region:district, timestamp:new Date().toISOString() }),
    }).catch(() => {});
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role:'user', content:input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveHistory(input);
    setInput('');
    setSelectedTags([]);
    setLoading(true);
    setWaitMsg(sw ? 'Afya anaangalia dalili zako...' : 'Afya is reviewing your symptoms...');

    const reply = await askAfya(newMessages, (step) => {
      console.log('[Afya debug]', step);
      setDebugInfo(prev => [...prev.slice(-4), step]);
    });

    setWaitMsg('');
    setLoading(false);

    if (reply) {
      setMessages([...newMessages, { role:'assistant', content:reply }]);
      if (/emergency|hospital.*now|immediately|go.*now/i.test(reply)) setEmergency(true);
    } else {
      setMessages([...newMessages, {
        role:'assistant',
        content: sw
          ? 'Samahani, muunganisho umeshindwa. Tafadhali angalia intaneti yako na ujaribu tena.'
          : 'Sorry, could not connect. Please check your internet and try again.',
      }]);
    }
  }

  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', height:'calc(100vh - 130px)' }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>🤒 {t.symptoms} <span style={{fontSize:10, color:'#9ca3af', fontWeight:400}}>v3-debug</span></div>
      {debugInfo.length > 0 && (
        <div style={{ background:'#1e293b', color:'#4ade80', borderRadius:8, padding:'8px 10px', marginBottom:8, fontSize:10, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {debugInfo.map((d, i) => <div key={i}>{d}</div>)}
        </div>
      )}

      {emergency && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'9px 12px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#ef4444' }}>🚨 {sw?'Nenda hospitalini SASA':'Go to hospital NOW'}</div>
          <a href="tel:112" style={{ background:'#ef4444', color:'#fff', padding:'5px 12px', borderRadius:8, fontSize:12, textDecoration:'none', fontWeight:600 }}>112</a>
        </div>
      )}

      {/* Symptom tags */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
        {t.symptomTags.map((tag, i) => {
          const sel = selectedTags.includes(tag);
          return (
            <button key={i} onClick={() => toggleTag(tag)}
              style={{ padding:'4px 9px', borderRadius:99, fontSize:11, cursor:'pointer', transition:'all 0.15s',
                background:sel?'#2563eb':'#f3f4f6', border:sel?'1px solid #2563eb':'1px solid #e5e7eb',
                color:sel?'#fff':'#374151', fontWeight:sel?600:400 }}>
              {sel ? '✓ ' : ''}{tag}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
          <span>✓ {selectedTags.length} {sw?'zimechaguliwa':'selected'}</span>
          <button onClick={() => { setSelectedTags([]); setInput(''); }}
            style={{ fontSize:11, color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>
            {sw?'Futa zote':'Clear all'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
            {m.role==='assistant' && (
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:6, flexShrink:0, alignSelf:'flex-end' }}>🤖</div>
            )}
            <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius:16,
              background:m.role==='user'?'#2563eb':'#fff',
              color:m.role==='user'?'#fff':'#111',
              border:m.role==='user'?'none':'1px solid #e5e7eb',
              fontSize:14, lineHeight:1.55,
              borderBottomRightRadius:m.role==='user'?4:16,
              borderBottomLeftRadius:m.role==='assistant'?4:16 }}>
              {m.role==='assistant' ? renderMessage(m.content, setPage, lang) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', marginBottom:8, gap:6 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, borderBottomLeftRadius:4, padding:'10px 14px' }}>
              {waitMsg ? (
                <div style={{ fontSize:12, color:'#6b7280' }}>{waitMsg}</div>
              ) : (
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af', display:'inline-block', animation:'bounce 1.2s ease-in-out infinite' }} />
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af', display:'inline-block', animation:'bounce 1.2s ease-in-out 0.2s infinite' }} />
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af', display:'inline-block', animation:'bounce 1.2s ease-in-out 0.4s infinite' }} />
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder={t.typeSymptoms}
          style={{ flex:1, padding:'10px 13px', borderRadius:10, border:`1px solid ${input?'#2563eb':'#e5e7eb'}`, fontSize:14, background:'#fff' }} />
        <button onClick={send} disabled={loading||!input.trim()}
          style={{ padding:'10px 15px', background:input.trim()&&!loading?'#2563eb':'#e5e7eb', color:'#fff', border:'none', borderRadius:10, cursor:input.trim()&&!loading?'pointer':'default', fontSize:18 }}>➤</button>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
