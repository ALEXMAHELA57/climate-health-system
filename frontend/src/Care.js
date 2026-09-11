import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import Consultation from './Consultation';
import Clinics from './Clinics';

export default function Care({ t, lang, district, onDistrictChange, careFilter, clearCareFilter, initialView }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [view, setView] = useState(initialView || 'expert'); // expert | facility | appointments

  useEffect(() => {
    setView(initialView || 'expert');
  }, [initialView, careFilter]);

  const tabs = [
    { id: 'expert', en: 'Find an Expert', sw: 'Tafuta Mtaalamu' },
    { id: 'facility', en: 'Find a Facility', sw: 'Tafuta Kituo' },
    { id: 'appointments', en: 'My Appointments', sw: 'Miadi Yangu' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '16px 16px 0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setView(tab.id); if (tab.id !== 'expert') clearCareFilter && clearCareFilter(); }}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === tab.id ? '#2563eb' : theme.card, color: view === tab.id ? '#fff' : theme.textMuted }}>
            {sw ? tab.sw : tab.en}
          </button>
        ))}
      </div>

      {view === 'facility'
        ? <Clinics t={t} lang={lang} district={district} onDistrictChange={onDistrictChange} />
        : <Consultation lang={lang} initialSpecialty={careFilter} hideTabs externalView={view === 'appointments' ? 'my' : 'browse'} />}
    </div>
  );
}
