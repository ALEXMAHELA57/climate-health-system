import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import Consultation from './Consultation';
import Clinics from './Clinics';

export default function Care({ t, lang, district, onDistrictChange, careFilter, clearCareFilter }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [view, setView] = useState('expert'); // expert | facility

  useEffect(() => {
    if (careFilter) setView('expert');
  }, [careFilter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0' }}>
        <button onClick={() => { setView('expert'); clearCareFilter && clearCareFilter(); }}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: view === 'expert' ? '#2563eb' : theme.card, color: view === 'expert' ? '#fff' : theme.textMuted }}>
          {sw ? 'Tafuta Mtaalamu' : 'Find an Expert'}
        </button>
        <button onClick={() => setView('facility')}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: view === 'facility' ? '#2563eb' : theme.card, color: view === 'facility' ? '#fff' : theme.textMuted }}>
          {sw ? 'Tafuta Kituo' : 'Find a Facility'}
        </button>
      </div>

      {view === 'expert'
        ? <Consultation lang={lang} initialSpecialty={careFilter} />
        : <Clinics t={t} lang={lang} district={district} onDistrictChange={onDistrictChange} />}
    </div>
  );
}
