import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import Weather from './Weather';
import RiskMap from './RiskMap';
import CommunityReport from './CommunityReport';

export default function Climate({ t, lang, district, onDistrictChange }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [view, setView] = useState('weather'); // weather | map | reports

  const tabs = [
    { id: 'weather', en: 'Weather', sw: 'Hali ya Hewa' },
    { id: 'map', en: 'Risk Map', sw: 'Ramani ya Hatari' },
    { id: 'reports', en: 'Community', sw: 'Jamii' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '16px 16px 0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === tab.id ? '#2563eb' : theme.card, color: view === tab.id ? '#fff' : theme.textMuted }}>
            {sw ? tab.sw : tab.en}
          </button>
        ))}
      </div>

      {view === 'weather' && <Weather t={t} lang={lang} district={district} onDistrictChange={onDistrictChange} />}
      {view === 'map' && <RiskMap t={t} lang={lang} />}
      {view === 'reports' && <CommunityReport lang={lang} />}
    </div>
  );
}
