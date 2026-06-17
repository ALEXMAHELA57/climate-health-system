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

10. When a user asks for clinic numbers, hospital contacts, or where to go for treatment:
    - Always say: "Call 112 for any emergency - ambulance, police or fire."
    - Direct them to the Clinics tab: "Tap the Clinics tab at the bottom of this app to find the nearest hospital with phone numbers and directions."
    - You can also mention these major Tanzania hospitals: Muhimbili National Hospital Dar es Salaam +255222150610, Bugando Medical Centre Mwanza +255282500611, KCMC Moshi +255272754377, Mount Meru Hospital Arusha +255272508321, Iringa Regional Hospital +255262702285, Mbeya Zonal Hospital +255252503567.
    - Always end with: "For your nearest clinic tap the Clinics tab in this app."`;

export default function Symptoms({ t, lang, district }) {
  const [messages, setMessages]   = useState([{ role:'assistant', content:t.afyaGreet }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [waitMsg, setWaitMsg]     = useState('');
  const bottomRef = useRef(null);
  const sw = lang === 'sw';

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  // Track selected tags separately for visual feedback
  const [selectedTags, setSelectedTags] = useState([]);

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      // Deselect — remove from list
      const updated = selectedTags.filter(t => t !== tag);
      setSelectedTags(updated);
      setInput(updated.join(', '));
    } else {
      // Select — add to list
      const updated = [...selectedTags, tag];
      setSelectedTags(updated);
      setInput(updated.join(', '));
    }
  }

  // Save symptom to local history and also log to backend (non-blocking)
  function saveHistory(symptomText) {
    const hist = JSON.parse(localStorage.getItem('afya_symptom_history')||'[]');
    hist.push({ symptoms:symptomText, district, date:new Date().toISOString() });
    localStorage.setItem('afya_symptom_history', JSON.stringify(hist.slice(-20)));
    // Non-blocking backend log for outbreak tracking
    fetch(`${API}/api/symptoms/log`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ symptoms:symptomText, region:district, timestamp:new Date().toISOString() })
    }).catch(()=>{}); // fail silently — don't block the chat
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg     = { role:'user', content:input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const symptomText = input;
    setInput('');
    setSelectedTags([]);
    setLoading(true);

    saveHistory(symptomText);

    let replied = false;

    // Detect mobile — mobile browsers block direct Claude API calls due to CORS
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // Desktop: call Claude API directly (fast, ~1-2 seconds)
    // Mobile: go through backend to avoid CORS issues
    if (!isMobile) {
      const directKey = process.env.REACT_APP_ANTHROPIC_API_KEY || '';
      if (directKey) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(()=>controller.abort(), 20000);
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': directKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5',
              max_tokens: 600,
              system: SYSTEM_PROMPT,
              messages: newMessages.map(m=>({ role:m.role, content:m.content })),
            }),
          });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            const reply = stripMarkdown(data.content?.[0]?.text || '');
            if (reply) {
              setMessages([...newMessages, { role:'assistant', content:reply }]);
              if (/emergency|hospital.*now|immediately|go.*now/i.test(reply)) setEmergency(true);
              replied = true;
            }
          }
        } catch(e) {
          console.warn('Direct API failed, trying backend:', e.message);
        }
      }
    }

    // Mobile always uses backend, desktop falls back here if direct call failed
    if (!replied) {
      try {
        // Mobile — show progressive wait messages so user doesn't think it's frozen
        if (isMobile) {
          fetch(`${API}/`).catch(()=>{});
          // Natural messages — no mention of servers or backend
          const msgs = sw ? [
            'Afya anaangalia dalili zako...',
            'Afya anafikiria...',
            'Karibu na jibu...',
          ] : [
            'Afya is reviewing your symptoms...',
            'Afya is thinking...',
            'Almost ready...',
          ];
          setWaitMsg(msgs[0]);
          await new Promise(r => setTimeout(r, 3000));
          setWaitMsg(msgs[1]);
          await new Promise(r => setTimeout(r, 4000));
          setWaitMsg(msgs[2]);
        }
        const controller = new AbortController();
        const timer = setTimeout(()=>controller.abort(), 45000); // 45s for mobile (cold start)
        const res = await fetch(`${API}/api/symptoms/chat`, {
          method:'POST',
          signal: controller.signal,
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ messages:newMessages, region:district })
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          const reply = stripMarkdown(json.reply || '');
          if (reply) {
            setMessages([...newMessages, { role:'assistant', content:reply }]);
            if (/emergency|hospital.*now|immediately|go.*now/i.test(reply)) setEmergency(true);
            replied = true;
          }
        }
      } catch(e) {
        console.warn('Backend failed:', e.message);
      }
    }

    if (!replied) {
      setMessages([...newMessages, {
        role:'assistant',
        content: sw
          ? 'Samahani, muunganisho umeshindwa. Tafadhali angalia intaneti yako na ujaribu tena.'
          : 'Sorry, could not connect. Please check your internet and try again.'
      }]);
    }

    setWaitMsg('');
    setLoading(false);
  }

  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', height:'calc(100vh - 130px)' }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>🤒 {t.symptoms}</div>

      {emergency && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'9px 12px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#ef4444' }}>🚨 {sw?'Nenda hospitalini SASA':'Go to hospital NOW'}</div>
          <a href="tel:112" style={{ background:'#ef4444', color:'#fff', padding:'5px 12px', borderRadius:8, fontSize:12, textDecoration:'none', fontWeight:600 }}>112</a>
        </div>
      )}

      {/* Symptom tags */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
        {t.symptomTags.map((tag,i)=>{
          const isSelected = selectedTags.includes(tag);
          return (
            <button key={i} onClick={()=>toggleTag(tag)}
              style={{
                padding:'4px 9px', borderRadius:99, fontSize:11, cursor:'pointer',
                background: isSelected ? '#2563eb' : '#f3f4f6',
                border: isSelected ? '1px solid #2563eb' : '1px solid #e5e7eb',
                color: isSelected ? '#fff' : '#374151',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.15s',
              }}>
              {isSelected ? '✓ ' : ''}{tag}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>✓ {selectedTags.length} {sw ? 'dalili zimechaguliwa' : 'symptom(s) selected'}</span>
          <button onClick={()=>{ setSelectedTags([]); setInput(''); }}
            style={{ fontSize:11, color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>
            {sw ? 'Futa zote' : 'Clear all'}
          </button>
        </div>
      )}

      {/* Chat messages */}
      <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
            {m.role==='assistant' && (
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:6, flexShrink:0, alignSelf:'flex-end' }}>
                🤖
              </div>
            )}
            <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius:16,
              background:m.role==='user'?'#2563eb':'#fff',
              color:m.role==='user'?'#fff':'#111',
              border:m.role==='user'?'none':'1px solid #e5e7eb',
              fontSize:14, lineHeight:1.55,
              borderBottomRightRadius:m.role==='user'?4:16,
              borderBottomLeftRadius:m.role==='assistant'?4:16 }}>
              {m.content}
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

      {/* Input */}
      <div style={{ display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
          placeholder={t.typeSymptoms}
          style={{ flex:1, padding:'10px 13px', borderRadius:10, border:`1px solid ${input?'#2563eb':'#e5e7eb'}`, fontSize:14, background:'#fff' }} />
        <button onClick={send} disabled={loading||!input.trim()}
          style={{ padding:'10px 15px', background:input.trim()&&!loading?'#2563eb':'#e5e7eb', color:'#fff', border:'none', borderRadius:10, cursor:input.trim()&&!loading?'pointer':'default', fontSize:18 }}>➤</button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
