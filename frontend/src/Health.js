import React, { useState } from 'react';
import {
  Stethoscope, Brain, UserRound, Users, Baby, CalendarHeart,
  Smile, HeartPulse, Sparkles, Apple, HandHeart, MessageCircle, UserSearch, ArrowLeft, Building2, FlaskConical, ClipboardList,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import Assessment from './Assessment';
import MenstrualCycle from './MenstrualCycle';

const ASSESSMENT_NAMES = {
  phq9: { en: 'PHQ-9 (Depression Screening)', sw: 'PHQ-9 (Uchunguzi wa Msongo wa Mawazo)' },
  gad7: { en: 'GAD-7 (Anxiety Screening)', sw: 'GAD-7 (Uchunguzi wa Wasiwasi)' },
};

const DOMAINS = [
  { id: 'general', specialty: 'general', Icon: Stethoscope, en: 'General Health', sw: 'Afya ya Jumla', color: '#2563eb', bg: '#eff6ff' },
  { id: 'mental_health', specialty: 'mental_health', Icon: Brain, en: 'Mental Health', sw: 'Afya ya Akili', color: '#0d9488', bg: '#f0fdfa', assessments: ['phq9', 'gad7'] },
  { id: 'male_reproductive', specialty: 'male_reproductive', Icon: UserRound, en: "Men's Reproductive Health", sw: 'Afya ya Uzazi wa Mwanaume', color: '#0369a1', bg: '#f0f9ff', showFor: 'male' },
  { id: 'female_reproductive', specialty: 'female_reproductive', Icon: Users, en: "Women's Reproductive Health", sw: 'Afya ya Uzazi wa Mwanamke', color: '#db2777', bg: '#fdf2f8', showFor: 'female' },
  { id: 'menstrual_cycle', specialty: 'menstrual_cycle', Icon: CalendarHeart, en: 'Menstrual Cycle', sw: 'Mzunguko wa Hedhi', color: '#e11d48', bg: '#fff1f2', showFor: 'female' },
  { id: 'maternal_health', specialty: 'maternal_health', Icon: Baby, en: 'Maternal & Child Health', sw: 'Afya ya Mama na Mtoto', color: '#c026d3', bg: '#fdf4ff' },
  { id: 'dental', specialty: 'dental', Icon: Smile, en: 'Dental', sw: 'Meno', color: '#0891b2', bg: '#ecfeff' },
  { id: 'cardiology', specialty: 'cardiology', Icon: HeartPulse, en: 'Cardiology', sw: 'Moyo', color: '#dc2626', bg: '#fef2f2' },
  { id: 'dermatology', specialty: 'dermatology', Icon: Sparkles, en: 'Skin (Dermatology)', sw: 'Ngozi', color: '#d97706', bg: '#fffbeb' },
  { id: 'nutrition', specialty: 'nutrition', Icon: Apple, en: 'Nutrition', sw: 'Lishe', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'palliative_care', specialty: 'palliative_care', Icon: HandHeart, en: 'Palliative Care', sw: 'Huduma ya Faraja', color: '#7c3aed', bg: '#f5f3ff' },
];

export default function Health({ lang, user, setPage, setCareFilter, setAfyaTopic, setCareView, setAfyaReturnPage, selectedDomainId, setSelectedDomainId }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [selected, setSelected] = useState(() => selectedDomainId ? DOMAINS.find(d => d.id === selectedDomainId) : null);

  const visibleDomains = DOMAINS.filter(d => !d.showFor || d.showFor === user?.gender || !user?.gender);

  function openDomain(d) {
    setSelected(d);
    setSelectedDomainId && setSelectedDomainId(d.id);
  }

  function askAfya(d) {
    setAfyaTopic(sw ? d.sw : d.en);
    setAfyaReturnPage && setAfyaReturnPage('health');
    setPage('symptoms');
  }

  function findExpert(d) {
    setCareFilter(d.specialty);
    setCareView && setCareView('expert');
    setPage('care');
  }

  function findFacility() {
    setCareFilter(null);
    setCareView && setCareView('facility');
    setPage('care');
  }

  function findLab() {
    setPage('lab');
  }

  const [activeAssessment, setActiveAssessment] = useState(null);
  const [showCycleTracker, setShowCycleTracker] = useState(false);

  if (showCycleTracker) {
    return (
      <div>
        <div style={{ padding: '16px 16px 0' }}>
          <button onClick={() => setShowCycleTracker(false)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> {sw ? 'Rudi' : 'Back'}
          </button>
        </div>
        <MenstrualCycle lang={lang} />
      </div>
    );
  }

  if (activeAssessment) {
    return (
      <Assessment
        lang={lang} assessmentId={activeAssessment}
        onBack={() => setActiveAssessment(null)}
        setPage={setPage} setAfyaTopic={setAfyaTopic}
        setCareFilter={setCareFilter} setCareView={setCareView}
        setAfyaReturnPage={setAfyaReturnPage}
      />
    );
  }

  if (selected) {
    const d = selected;
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => { setSelected(null); setSelectedDomainId && setSelectedDomainId(null); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> {sw ? 'Rudi' : 'Back'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <d.Icon size={22} color={d.color} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{sw ? d.sw : d.en}</div>
        </div>

        <button onClick={() => askAfya(d)}
          style={{ width: '100%', background: d.bg, border: `1px solid ${d.color}30`, borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <MessageCircle size={22} color={d.color} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? 'Ongea na Afya AI' : 'Ask Afya AI'}</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Jifunze na uulize maswali' : 'Learn and ask questions'}</div>
          </div>
        </button>

        {d.id === 'menstrual_cycle' && (
          <button onClick={() => setShowCycleTracker(true)}
            style={{ width: '100%', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ClipboardList size={22} color="#db2777" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? 'Fuatilia Mzunguko Wangu' : 'Track My Cycle'}</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Siku, utabiri, na dalili' : 'Cycle day, predictions, and symptoms'}</div>
            </div>
          </button>
        )}

        {d.assessments && d.assessments.map(aid => (
          <button key={aid} onClick={() => setActiveAssessment(aid)}
            style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ClipboardList size={22} color={d.color} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? ASSESSMENT_NAMES[aid]?.sw : ASSESSMENT_NAMES[aid]?.en}</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Chukua tathmini fupi' : 'Take a short screening'}</div>
            </div>
          </button>
        ))}

        <button onClick={() => findExpert(d)}
          style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserSearch size={22} color={theme.textMuted} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? 'Tafuta Mtaalamu' : 'Find an Expert'}</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Piga simu, chat, au weka miadi' : 'Call, chat, or book an appointment'}</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => setPage('home')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> {sw ? 'Nyumbani' : 'Home'}
      </button>
      <button onClick={findFacility}
        style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Building2 size={22} color="#2563eb" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? 'Tafuta Hospitali au Kliniki' : 'Find a Hospital or Clinic'}</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Umbali, mawasiliano, saa za kazi' : 'Distance, contact, opening hours'}</div>
        </div>
      </button>

      <button onClick={findLab}
        style={{ width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <FlaskConical size={22} color="#16a34a" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sw ? 'Weka Miadi ya Vipimo' : 'Book a Lab Test'}</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>{sw ? 'Damu, kisukari, ujauzito, na zaidi' : 'Blood work, diabetes, pregnancy, and more'}</div>
        </div>
      </button>

      <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 14 }}>
        {sw ? 'Au chagua sehemu ili kujifunza au kupata msaada' : 'Or choose an area to learn more or get help'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {visibleDomains.map(d => (
          <button key={d.id} onClick={() => openDomain(d)}
            style={{ background: d.bg, border: `1px solid ${d.color}30`, borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer' }}>
            <d.Icon size={22} color={d.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{sw ? d.sw : d.en}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
