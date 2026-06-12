import React, { useState, useRef, useEffect } from 'react';
import { API, stripMarkdown } from './constants';

export default function Symptoms({ t, lang, district }) {
  const [messages, setMessages] = useState([{ role:'assistant', content:t.afyaGreet }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [emergency, setEmergency] = useState(false);
  const bottomRef = useRef(null);
  const sw = lang === 'sw';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  function addTag(tag) { setInput(p => p ? `${p}, ${tag}` : tag); }

  async function send() {
    if (!input.trim()) return;
    const userMsg    = { role:'user', content:input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const hist = JSON.parse(localStorage.getItem('afya_symptom_history')||'[]');
    hist.push({ symptoms:input, district, date:new Date().toISOString() });
    localStorage.setItem('afya_symptom_history', JSON.stringify(hist.slice(-20)));
    try {
      const res  = await fetch(`${API}/api/symptoms/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:newMessages, region:district })
      });
      const json = await res.json();
      const reply = stripMarkdown(json.reply || '');
      setMessages([...newMessages, { role:'assistant', content:reply }]);
      if (/emergency|hospital.*now|immediately|go.*now/i.test(reply)) setEmergency(true);
    } catch {
      setMessages([...newMessages, { role:'assistant', content: sw?'Samahani, hakuna muunganisho. Jaribu tena.':'Sorry, could not connect. Please try again.' }]);
    }
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

      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
        {t.symptomTags.map((tag,i)=>(
          <button key={i} onClick={()=>addTag(tag)}
            style={{ padding:'4px 9px', borderRadius:99, background:'#f3f4f6', border:'1px solid #e5e7eb', fontSize:11, cursor:'pointer', color:'#374151' }}>
            {tag}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
            <div style={{ maxWidth:'82%', padding:'9px 13px', borderRadius:16,
              background:m.role==='user'?'#2563eb':'#fff',
              color:m.role==='user'?'#fff':'#111',
              border:m.role==='user'?'none':'1px solid #e5e7eb',
              fontSize:14, lineHeight:1.5,
              borderBottomRightRadius:m.role==='user'?4:16,
              borderBottomLeftRadius:m.role==='assistant'?4:16 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:8 }}>
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, borderBottomLeftRadius:4, padding:'9px 13px', fontSize:13, color:'#9ca3af' }}>{t.typing}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder={t.typeSymptoms}
          style={{ flex:1, padding:'10px 13px', borderRadius:10, border:`1px solid ${input?'#2563eb':'#e5e7eb'}`, fontSize:14, background:'#fff' }} />
        <button onClick={send} disabled={loading||!input.trim()}
          style={{ padding:'10px 15px', background:input.trim()?'#2563eb':'#e5e7eb', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:18 }}>➤</button>
      </div>
    </div>
  );
}
