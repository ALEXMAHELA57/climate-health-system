import React from 'react';

const SYMPTOM_TAGS = [
  { en: 'Fever', sw: 'Homa' },
  { en: 'Headache', sw: 'Maumivu ya kichwa' },
  { en: 'Cough', sw: 'Kikohozi' },
  { en: 'Diarrhea', sw: 'Kuhara' },
  { en: 'Vomiting', sw: 'Kutapika' },
  { en: 'Chills', sw: 'Baridi kali' },
  { en: 'Fatigue', sw: 'Uchovu mkubwa' },
  { en: 'Rash', sw: 'Upele wa ngozi' },
  { en: 'Sore throat', sw: 'Koo kuuma' },
  { en: 'Chest pain', sw: 'Maumivu ya kifua' },
  { en: 'Difficulty breathing', sw: 'Ugumu wa kupumua' },
  { en: 'Stomach pain', sw: 'Maumivu ya tumbo' },
];

// Age group labels for display
const AGE_GROUP_LABELS = {
  under5:  { en: 'Child under 5', sw: 'Mtoto chini ya miaka 5' },
  '5to17': { en: 'Child / Teen 5–17', sw: 'Mtoto/Kijana miaka 5–17' },
  '18to35':{ en: 'Adult 18–35', sw: 'Mtu mzima miaka 18–35' },
  '36to59':{ en: 'Adult 36–59', sw: 'Mtu mzima miaka 36–59' },
  '60plus':{ en: 'Elderly 60+', sw: 'Mzee miaka 60+' },
};

function buildSystemPrompt(lang) {
  const t = lang === 'sw';
  const ageGroup = localStorage.getItem('ageGroup') || '';
  const region   = localStorage.getItem('selectedDistrict') || 'Tanzania';

  const ageGuidance = {
    under5: t
      ? `Mtumiaji anaripoti dalili za mtoto mwenye UMRI WA CHINI YA MIAKA 5.
KANUNI MUHIMU:
- Homa yoyote (≥37.5°C) = NENDA HOSPITALI HARAKA, usichelewe kamwe.
- Kuhara + kutapika = hatari ya upungufu wa maji mwilini inayoweza kuua ndani ya masaa machache.
- Ugumu wa kupumua, kukosa fahamu, kukataa kunywa = dharura ya kweli.
- KAMWE usipendekeze dawa za nyumbani au kusubiri — mweleze mzazi aende kliniki MARA MOJA.`
      : `User is reporting symptoms for a child UNDER 5 YEARS OLD.
CRITICAL RULES:
- Any fever (≥37.5°C) = go to hospital NOW, never delay.
- Diarrhea + vomiting = life-threatening dehydration risk within hours.
- Difficulty breathing, unconsciousness, refusing fluids = genuine emergency.
- NEVER suggest home remedies or waiting — always direct parent to clinic IMMEDIATELY.`,

    '5to17': t
      ? `Mtumiaji anaripoti dalili za mtoto/kijana wa MIAKA 5 HADI 17.
MWONGOZO:
- Homa ≥38.5°C inayodumu zaidi ya siku 2 = nenda kliniki.
- Malaria ni tishio — homa + baridi + maumivu ya kichwa = pima malaria kwanza.
- Uliza kama wenzake wa shule wana dalili kama hizo (mlipuko wa shule).`
      : `User is reporting symptoms for a CHILD/TEEN aged 5–17.
GUIDANCE:
- Fever ≥38.5°C lasting more than 2 days = visit clinic.
- Malaria is top concern — fever + chills + headache = advise malaria test first.
- Ask if classmates have similar symptoms (school outbreak risk).`,

    '18to35': t
      ? `Mtumiaji ni mtu mzima wa MIAKA 18 HADI 35.
MWONGOZO:
- Homa ≥38.5°C au inayodumu zaidi ya siku 3 = nenda kliniki.
- Kwa wanawake wenye mimba: homa, maumivu ya tumbo, au kutokwa damu = dharura ya haraka.
- Kwa ujumla, anaweza kufuatilia nyumbani kwa masaa 24 isipokuwa dalili ni kali.`
      : `User is a YOUNG ADULT aged 18–35.
GUIDANCE:
- Fever ≥38.5°C or lasting more than 3 days = visit clinic.
- For women who may be pregnant: fever, abdominal pain, or bleeding = urgent care immediately.
- Generally can monitor at home for 24 hours unless symptoms are severe.`,

    '36to59': t
      ? `Mtumiaji ni mtu mzima wa MIAKA 36 HADI 59.
MWONGOZO:
- Watu wa umri huu wanaweza kuwa na kisukari au shinikizo la damu — zingatia hili.
- Homa ≥38°C + dalili nyingine = nenda kliniki mapema.
- Maumivu ya kifua au upumuaji mgumu = dharura — nenda hospitali haraka.
- Sisitiza sana kunywa maji ya kutosha.`
      : `User is a MIDDLE-AGED ADULT aged 36–59.
GUIDANCE:
- May have underlying conditions (diabetes, hypertension) — factor this in.
- Fever ≥38°C with other symptoms = seek clinic early, don't delay.
- Chest pain or difficulty breathing = emergency — go to hospital now.
- Emphasize staying well-hydrated.`,

    '60plus': t
      ? `Mtumiaji ni mzee wa MIAKA 60 NA ZAIDI.
KANUNI MUHIMU:
- Homa YOYOTE (hata ≥37.5°C) = nenda kliniki LEO — wazee mara nyingi hawapati homa kali hata wakiwa wagonjwa sana.
- Kuchanganyikiwa, udhaifu mkubwa, au kuanguka = ishara za hatari — hospitali mara moja.
- Upungufu wa maji mwilini unaweza kuwa mbaya haraka sana — sisitiza sana.
- KAMWE usipendekeze kusubiri siku nyingi — wazee wanahitaji tathmini ya mapema.`
      : `User is an ELDERLY person aged 60+.
CRITICAL RULES:
- ANY fever (even ≥37.5°C) = go to clinic TODAY — elderly often don't run high fevers even when seriously ill.
- Confusion, sudden weakness, or falling = danger signs — hospital immediately.
- Dehydration becomes dangerous very quickly in elderly — emphasize this strongly.
- NEVER suggest waiting several days — elderly need early assessment.`,
  };

  const ageBlock = ageGuidance[ageGroup] || (t
    ? '(Kundi la umri halijachaguliwa — toa ushauri wa jumla wa Tanzania.)'
    : '(No age group set — give general Tanzania health advice.)');

  const clinicInstruction = t
    ? 'Ukiombwa kliniki/hospitali: jibu kwa sentensi MOJA fupi kisha andika tu: [FUNGUA KLINIKI]. USITOE orodha ya hospitali.'
    : 'If asked for clinic/hospital: respond in ONE short sentence then write exactly: [OPEN CLINICS TAB]. Do NOT list hospital names.';

  if (t) {
    return `Wewe ni Afya, msaidizi wa afya wa AfyaHewa kwa Tanzania. Unazungumza Kiswahili safi.

TAARIFA ZA MTUMIAJI:
- Mkoa: ${region}
- ${ageBlock}

MWONGOZO WA JUMLA:
- Toa ushauri wa afya wa vitendo kulingana na hali ya Tanzania (malaria, kipindupindu, typhoid, dengue ni ya kawaida).
- Usiulize maswali mengi — uliza swali MOJA muhimu zaidi ukihitaji.
- Kwa dalili kali: eleza hatua moja ya haraka, toa nambari ya dharura 112.
- Jibu kwa ufupi — mistari 3–5 tu.
- USIWE daktari wa kujifanya — pendekeza kwenda kliniki ukihitajika.
- ${clinicInstruction}`;
  }

  return `You are Afya, the health assistant for AfyaHewa in Tanzania. Respond in English.

USER CONTEXT:
- Region: ${region}
- ${ageBlock}

GENERAL GUIDANCE:
- Give practical health advice grounded in Tanzania's context (malaria, cholera, typhoid, dengue are common).
- Don't ask multiple questions — ask ONE most important question if needed.
- For severe symptoms: give one immediate action, provide emergency number 112.
- Keep responses concise — 3–5 lines maximum.
- Don't play doctor — recommend clinic visit when appropriate.
- ${clinicInstruction}`;
}

// Severe symptom keywords that trigger an immediate urgent banner
const SEVERE_EN = ['bleeding','unconscious','can\'t breathe','difficulty breathing','not breathing','collapsed','seizure','fitting','severe chest pain','stroke'];
const SEVERE_SW = ['kutokwa damu','kupoteza fahamu','ugumu wa kupumua','kushindwa kupumua','mshtuko','maumivu makali ya kifua'];

function checkSevere(text) {
  const lower = text.toLowerCase();
  return [...SEVERE_EN, ...SEVERE_SW].some(kw => lower.includes(kw));
}

export default function Symptoms({ lang, setPage, API }) {
  const t = lang === 'sw';
  const ageGroup = localStorage.getItem('ageGroup') || '';
  const ageLabel = ageGroup ? (AGE_GROUP_LABELS[ageGroup]?.[lang] || '') : '';

  const [messages, setMessages] = React.useState([
    {
      role: 'assistant',
      content: t
        ? `Habari! Mimi ni Afya 👋\n\nNieleze dalili zako${ageLabel ? ` (ninafahamu una ${ageLabel})` : ''} na nitakusaidia kupata ushauri wa afya unaofaa. Unajisikiaje leo?`
        : `Hello! I'm Afya 👋\n\nTell me your symptoms${ageLabel ? ` (I know you're in the ${ageLabel} group)` : ''} and I'll help you get the right health guidance. How are you feeling today?`,
    }
  ]);
  const [input, setInput]               = React.useState('');
  const [loading, setLoading]           = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [severeAlert, setSevereAlert]   = React.useState(false);
  const messagesEndRef = React.useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const buildInputFromTags = () => {
    if (selectedTags.length === 0) return;
    const tagText = selectedTags.join(', ');
    setInput(prev => prev ? `${prev}, ${tagText}` : tagText);
    setSelectedTags([]);
  };

  // Log symptoms to backend for outbreak tracking (non-blocking)
  const logSymptoms = async (text) => {
    const region = localStorage.getItem('selectedDistrict') || '';
    if (!region) return;
    try {
      await fetch(`${API}/api/symptoms/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, symptoms: text, age_group: ageGroup }),
      });
    } catch {}
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Check for severe symptoms immediately
    if (checkSevere(text)) {
      setSevereAlert(true);
    }

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Log in background
    logSymptoms(text);

    const systemPrompt = buildSystemPrompt(lang);
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    let reply = null;

    // Try Vercel serverless function first (same domain, no CORS, fastest)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, system: systemPrompt }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.content;
      }
    } catch {}

    // Fallback: Render backend
    if (!reply) {
      try {
        const res = await fetch(`${API}/api/symptoms/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, system: systemPrompt, language: lang }),
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.content || data.reply;
        }
      } catch {}
    }

    if (!reply) {
      reply = t
        ? 'Samahani, sikuweza kuunganika. Tafadhali jaribu tena, au piga simu 112 kwa dharura.'
        : 'Sorry, could not connect. Please try again, or call 112 for emergencies.';
    }

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user';
    const showClinicButton =
      !isUser && (
        msg.content.includes('[OPEN CLINICS TAB]') ||
        msg.content.includes('[FUNGUA KLINIKI]') ||
        (/clinic|hospital|kliniki|hospitali/i.test(msg.content) && !isUser)
      );

    const cleanContent = msg.content
      .replace('[OPEN CLINICS TAB]', '')
      .replace('[FUNGUA KLINIKI]', '')
      .trim();

    return (
      <div key={i} style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        alignItems: 'flex-end',
        gap: 8,
      }}>
        {!isUser && (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>🤖</div>
        )}
        <div style={{
          maxWidth: '78%',
          padding: '11px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? '#2563eb' : '#f3f4f6',
          color: isUser ? '#fff' : '#1f2937',
          fontSize: 14,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}>
          {cleanContent}
          {showClinicButton && (
            <button
              onClick={() => setPage && setPage('clinics')}
              style={{
                display: 'block', marginTop: 10,
                padding: '9px 14px', borderRadius: 8, border: 'none',
                background: '#2563eb', color: '#fff',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%',
              }}
            >
              🏥 {t ? 'Fungua Kliniki' : 'Open Clinics'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>

      {/* Severe alert banner */}
      {severeAlert && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '12px 14px', margin: '0 12px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
              🚨 {t ? 'Dalili za Dharura' : 'Emergency Symptoms Detected'}
            </div>
            <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 3 }}>
              {t
                ? 'Nenda hospitali haraka au piga simu 112 sasa hivi.'
                : 'Go to hospital immediately or call 112 now.'}
            </div>
          </div>
          <button
            onClick={() => setSevereAlert(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: 0 }}
          >✕</button>
        </div>
      )}

      {/* Age group indicator */}
      {ageLabel && (
        <div style={{
          margin: '0 12px 6px',
          padding: '6px 12px',
          background: '#eff6ff',
          borderRadius: 8,
          fontSize: 12,
          color: '#2563eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>👤 {ageLabel} · {t ? 'Ushauri umeboreshwa kwa umri wako' : 'Advice tailored to your age group'}</span>
          <button
            onClick={() => setPage && setPage('profile')}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}
          >
            {t ? 'Badilisha' : 'Change'}
          </button>
        </div>
      )}

      {!ageLabel && (
        <div style={{
          margin: '0 12px 6px',
          padding: '6px 12px',
          background: '#fffbeb',
          borderRadius: 8,
          fontSize: 12,
          color: '#92400e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠️ {t ? 'Weka kundi la umri kwa ushauri bora' : 'Set your age group for better advice'}</span>
          <button
            onClick={() => setPage && setPage('profile')}
            style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}
          >
            {t ? 'Weka Sasa' : 'Set Now'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {messages.map((msg, i) => renderMessage(msg, i))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🤖</div>
            <div style={{
              padding: '11px 16px', borderRadius: '18px 18px 18px 4px',
              background: '#f3f4f6', display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#9ca3af',
                  animation: 'bounce 1.2s infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Symptom tags */}
      <div style={{ padding: '6px 12px 4px', borderTop: '1px solid #f3f4f6' }}>
        <div style={{ overflowX: 'auto', display: 'flex', gap: 7, paddingBottom: 6 }}>
          {SYMPTOM_TAGS.map(tag => {
            const label = t ? tag.sw : tag.en;
            const selected = selectedTags.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleTag(label)}
                style={{
                  flexShrink: 0,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: selected ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
                  background: selected ? '#2563eb' : '#fff',
                  color: selected ? '#fff' : '#374151',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: selected ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {selected && <span>✓</span>}
                {label}
              </button>
            );
          })}
        </div>
        {selectedTags.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#2563eb' }}>
              ✓ {selectedTags.length} {t ? 'dalili zimechaguliwa' : 'symptoms selected'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelectedTags([])}
                style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t ? 'Futa zote' : 'Clear all'}
              </button>
              <button
                onClick={buildInputFromTags}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none',
                  background: '#2563eb', color: '#fff', fontSize: 12, cursor: 'pointer',
                }}
              >
                {t ? 'Ongeza' : 'Add to message'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={t ? 'Eleza dalili zako...' : 'Describe your symptoms...'}
          style={{
            flex: 1, padding: '11px 14px', borderRadius: 24,
            border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: !input.trim() || loading ? '#e5e7eb' : '#2563eb',
            color: '#fff', fontSize: 20, cursor: !input.trim() || loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ➤
        </button>
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
