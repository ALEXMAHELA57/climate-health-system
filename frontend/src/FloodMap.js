import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── FLOOD ZONE DATA ─────────────────────────────────────────────
const FLOOD_ZONES = [
  // Dar es Salaam
  {
    id: 'dsm_msimbazi',
    name: 'Msimbazi River Basin',
    district: 'Dar es Salaam',
    risk: 'high',
    description: 'Low-lying area prone to flash floods during heavy rain. Msimbazi River overflows regularly.',
    affected: '~50,000 residents',
    coordinates: [[-6.82, 39.27], [-6.85, 39.28], [-6.86, 39.25], [-6.83, 39.24]],
  },
  {
    id: 'dsm_jangwani',
    name: 'Jangwani Low-lying Area',
    district: 'Dar es Salaam',
    risk: 'emergency',
    description: 'Extremely flood-prone area. Floods almost every rainy season. Avoid during heavy rain.',
    affected: '~20,000 residents',
    coordinates: [[-6.80, 39.26], [-6.82, 39.27], [-6.83, 39.25], [-6.81, 39.24]],
  },
  {
    id: 'dsm_temeke',
    name: 'Temeke Coastal Zone',
    district: 'Dar es Salaam',
    risk: 'medium',
    description: 'Coastal flooding risk during high tides combined with heavy rainfall.',
    affected: '~30,000 residents',
    coordinates: [[-6.87, 39.30], [-6.90, 39.32], [-6.92, 39.30], [-6.89, 39.28]],
  },

  // Morogoro - Kilombero Valley
  {
    id: 'morogoro_kilombero',
    name: 'Kilombero Valley',
    district: 'Morogoro',
    risk: 'high',
    description: 'Major flood plain. Kilombero River regularly floods vast agricultural areas.',
    affected: '~100,000 residents',
    coordinates: [[-8.10, 36.30], [-8.20, 36.50], [-8.30, 36.40], [-8.15, 36.20]],
  },
  {
    id: 'morogoro_rufiji',
    name: 'Rufiji River Basin',
    district: 'Morogoro',
    risk: 'high',
    description: 'Rufiji River basin floods during long rains. Major risk to downstream communities.',
    affected: '~80,000 residents',
    coordinates: [[-7.80, 37.20], [-7.90, 37.40], [-8.00, 37.30], [-7.85, 37.10]],
  },

  // Pwani - Rufiji Delta
  {
    id: 'pwani_rufiji_delta',
    name: 'Rufiji River Delta',
    district: 'Pwani',
    risk: 'emergency',
    description: 'Delta area floods severely every year. Communities at extreme risk during cyclones.',
    affected: '~60,000 residents',
    coordinates: [[-7.90, 39.20], [-8.00, 39.40], [-8.10, 39.30], [-7.95, 39.10]],
  },
  {
    id: 'pwani_kibiti',
    name: 'Kibiti Flood Plain',
    district: 'Pwani',
    risk: 'high',
    description: 'Low-lying coastal plain prone to flooding from both rivers and sea.',
    affected: '~25,000 residents',
    coordinates: [[-7.70, 38.90], [-7.80, 39.00], [-7.85, 38.95], [-7.75, 38.85]],
  },

  // Iringa - Ruaha River
  {
    id: 'iringa_ruaha',
    name: 'Ruaha River Banks',
    district: 'Iringa',
    risk: 'high',
    description: 'Great Ruaha River floods downstream communities and farmland during heavy rains.',
    affected: '~40,000 residents',
    coordinates: [[-7.60, 35.50], [-7.70, 35.70], [-7.80, 35.60], [-7.65, 35.40]],
  },
  {
    id: 'iringa_mtera',
    name: 'Mtera Dam Area',
    district: 'Iringa',
    risk: 'medium',
    description: 'Communities downstream of Mtera Dam at risk during dam overflow or controlled releases.',
    affected: '~15,000 residents',
    coordinates: [[-7.10, 35.80], [-7.20, 35.90], [-7.25, 35.85], [-7.15, 35.75]],
  },

  // Tanga - Pangani River
  {
    id: 'tanga_pangani',
    name: 'Pangani River Delta',
    district: 'Tanga',
    risk: 'high',
    description: 'Pangani River delta floods coastal communities. Risk increases during Indian Ocean high tides.',
    affected: '~35,000 residents',
    coordinates: [[-5.40, 38.95], [-5.50, 39.05], [-5.55, 39.00], [-5.45, 38.90]],
  },

  // Mwanza - Lake Victoria
  {
    id: 'mwanza_victoria',
    name: 'Lake Victoria Shoreline',
    district: 'Mwanza',
    risk: 'medium',
    description: 'Rising Lake Victoria levels flood shoreline communities and fishing villages.',
    affected: '~45,000 residents',
    coordinates: [[-2.40, 32.85], [-2.50, 32.95], [-2.55, 32.90], [-2.45, 32.80]],
  },

  // Kigoma - Lake Tanganyika
  {
    id: 'kigoma_tanganyika',
    name: 'Lake Tanganyika Shoreline',
    district: 'Kigoma',
    risk: 'medium',
    description: 'Lake Tanganyika shoreline flooding affects fishing communities and port areas.',
    affected: '~20,000 residents',
    coordinates: [[-4.85, 29.55], [-4.95, 29.65], [-5.00, 29.60], [-4.90, 29.50]],
  },

  // Lindi - Lukuledi River
  {
    id: 'lindi_lukuledi',
    name: 'Lukuledi River Basin',
    district: 'Lindi',
    risk: 'high',
    description: 'Lukuledi River floods agricultural land and villages during long rains.',
    affected: '~30,000 residents',
    coordinates: [[-10.00, 39.60], [-10.10, 39.70], [-10.15, 39.65], [-10.05, 39.55]],
  },

  // Mtwara
  {
    id: 'mtwara_coastal',
    name: 'Mtwara Coastal Lowlands',
    district: 'Mtwara',
    risk: 'medium',
    description: 'Low-lying coastal areas flood during heavy rain combined with high tides.',
    affected: '~25,000 residents',
    coordinates: [[-10.25, 40.15], [-10.35, 40.25], [-10.40, 40.20], [-10.30, 40.10]],
  },

  // Dodoma
  {
    id: 'dodoma_valley',
    name: 'Dodoma Central Valley',
    district: 'Dodoma',
    risk: 'low',
    description: 'Occasional flash flooding in valley areas during intense short rains.',
    affected: '~10,000 residents',
    coordinates: [[-6.15, 35.70], [-6.20, 35.80], [-6.25, 35.75], [-6.18, 35.65]],
  },

  // Kagera
  {
    id: 'kagera_river',
    name: 'Kagera River Basin',
    district: 'Kagera',
    risk: 'high',
    description: 'Kagera River regularly floods border communities. Risk increases with Lake Victoria levels.',
    affected: '~55,000 residents',
    coordinates: [[-1.40, 31.20], [-1.50, 31.40], [-1.60, 31.30], [-1.45, 31.10]],
  },

  // Songea / Ruvuma
  {
    id: 'songea_ruvuma',
    name: 'Ruvuma River Basin',
    district: 'Songea',
    risk: 'high',
    description: 'Ruvuma River forms Tanzania-Mozambique border. Floods affect communities on both banks.',
    affected: '~40,000 residents',
    coordinates: [[-10.80, 35.50], [-10.90, 35.70], [-11.00, 35.60], [-10.85, 35.40]],
  },
];

const RISK_COLORS = {
  low:       { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.25 },
  medium:    { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3  },
  high:      { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.35 },
  emergency: { color: '#7f1d1d', fillColor: '#7f1d1d', fillOpacity: 0.4  },
};

const RISK_LABELS = {
  en: { low:'Low', medium:'Medium', high:'High', emergency:'Emergency' },
  sw: { low:'Chini', medium:'Kati', high:'Juu', emergency:'Dharura' },
};

// District center coordinates for map centering
const DISTRICT_CENTERS = {
  'Dar es Salaam': [-6.8235, 39.2695],
  'Morogoro':      [-6.8218, 37.6619],
  'Pwani':         [-7.5,    38.5   ],
  'Iringa':        [-7.77,   35.69  ],
  'Tanga':         [-5.0688, 39.0987],
  'Mwanza':        [-2.5164, 32.9175],
  'Kigoma':        [-4.8833, 29.6333],
  'Lindi':         [-9.9989, 39.7144],
  'Mtwara':        [-10.267, 40.1833],
  'Dodoma':        [-6.1722, 35.7395],
  'Kagera':        [-1.4967, 31.3701],
  'Songea':        [-10.683, 35.65  ],
};

// Component to fly map to location
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function FloodMap({ t, lang }) {
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedZone, setSelectedZone]         = useState(null);
  const [userLocation, setUserLocation]         = useState(null);
  const [mapCenter, setMapCenter]               = useState([-6.3, 35.0]);
  const [mapZoom, setMapZoom]                   = useState(6);
  const [filter, setFilter]                     = useState('all');
  const [locating, setLocating]                 = useState(false);

  const rl = RISK_LABELS[lang] || RISK_LABELS.en;

  // Get unique districts that have flood zones
  const districts = ['All', ...new Set(FLOOD_ZONES.map(z => z.district))];

  // Filter zones
  const visibleZones = FLOOD_ZONES.filter(z => {
    const districtMatch = selectedDistrict === 'All' || z.district === selectedDistrict;
    const riskMatch = filter === 'all' || z.risk === filter;
    return districtMatch && riskMatch;
  });

  // Stats
  const stats = {
    emergency: FLOOD_ZONES.filter(z => z.risk === 'emergency').length,
    high:      FLOOD_ZONES.filter(z => z.risk === 'high').length,
    medium:    FLOOD_ZONES.filter(z => z.risk === 'medium').length,
    low:       FLOOD_ZONES.filter(z => z.risk === 'low').length,
  };

  function getUserLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(12);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  function focusDistrict(district) {
    setSelectedDistrict(district);
    if (district !== 'All' && DISTRICT_CENTERS[district]) {
      setMapCenter(DISTRICT_CENTERS[district]);
      setMapZoom(10);
    } else {
      setMapCenter([-6.3, 35.0]);
      setMapZoom(6);
    }
  }

  const riskPillStyle = (risk) => {
    const c = { low:'#166534', medium:'#92400e', high:'#991b1b', emergency:'#7f1d1d' };
    const b = { low:'#dcfce7', medium:'#fef9c3', high:'#fee2e2', emergency:'#fca5a5' };
    return { background: b[risk], color: c[risk], padding:'2px 8px',
      borderRadius:99, fontSize:11, fontWeight:600, display:'inline-block' };
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        🌊 {lang === 'en' ? 'Flood Zone Map' : 'Ramani ya Maeneo ya Mafuriko'}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        {lang === 'en'
          ? 'Tanzania flood-prone areas — tap a zone for details'
          : 'Maeneo hatarishi ya mafuriko Tanzania — gusa eneo kwa maelezo'}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: 'emergency', label: lang==='en'?'Emergency':'Dharura', count: stats.emergency, bg:'#fca5a5', color:'#7f1d1d' },
          { key: 'high',      label: lang==='en'?'High':'Juu',          count: stats.high,      bg:'#fee2e2', color:'#991b1b' },
          { key: 'medium',    label: lang==='en'?'Medium':'Kati',       count: stats.medium,    bg:'#fef9c3', color:'#92400e' },
          { key: 'low',       label: lang==='en'?'Low':'Chini',         count: stats.low,       bg:'#dcfce7', color:'#166534' },
        ].map(s => (
          <button key={s.key}
            onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            style={{ background: filter===s.key||filter==='all' ? s.bg : '#f3f4f6',
              color: filter===s.key||filter==='all' ? s.color : '#9ca3af',
              border: `1px solid ${filter===s.key ? s.color : '#e5e7eb'}`,
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
              fontSize: 12, fontWeight: 500 }}>
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* District filter + GPS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <select value={selectedDistrict} onChange={e => focusDistrict(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 10,
            border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}>
          {districts.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={getUserLocation} disabled={locating}
          style={{ padding: '8px 12px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            whiteSpace: 'nowrap' }}>
          {locating ? '...' : '📍 ' + (lang==='en' ? 'My location' : 'Mahali pangu')}
        </button>
      </div>

      {/* Map */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb',
        marginBottom: 12, height: 340 }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo center={mapCenter} zoom={mapZoom} />

          {/* Flood zones */}
          {visibleZones.map(zone => (
            <Polygon
              key={zone.id}
              positions={zone.coordinates}
              pathOptions={{
                ...RISK_COLORS[zone.risk],
                weight: selectedZone?.id === zone.id ? 3 : 1.5,
                dashArray: zone.risk === 'low' ? '5,5' : null,
              }}
              eventHandlers={{
                click: () => {
                  setSelectedZone(zone);
                  setMapCenter([
                    zone.coordinates.reduce((s,c)=>s+c[0],0)/zone.coordinates.length,
                    zone.coordinates.reduce((s,c)=>s+c[1],0)/zone.coordinates.length,
                  ]);
                  setMapZoom(11);
                }
              }}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{zone.name}</div>
                  <span style={riskPillStyle(zone.risk)}>{rl[zone.risk]}</span>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.4 }}>
                    {zone.description}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    👥 {zone.affected}
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* User location */}
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 }}>
              <Popup>
                <div style={{ fontWeight: 600 }}>
                  📍 {lang==='en' ? 'Your location' : 'Mahali ulipo'}
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12,
        background: '#f9fafb', border: '1px solid #f3f4f6',
        borderRadius: 10, padding: '8px 12px' }}>
        {[
          { risk:'emergency', label: lang==='en'?'Emergency':'Dharura' },
          { risk:'high',      label: lang==='en'?'High risk':'Hatari kubwa' },
          { risk:'medium',    label: lang==='en'?'Medium risk':'Hatari ya kati' },
          { risk:'low',       label: lang==='en'?'Low risk':'Hatari ndogo' },
        ].map(l => (
          <div key={l.risk} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3,
              background: RISK_COLORS[l.risk].fillColor, opacity: 0.8 }} />
            <span style={{ fontSize: 11, color: '#374151' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected zone detail */}
      {selectedZone && (
        <div style={{ background: '#fff', border: `1px solid ${RISK_COLORS[selectedZone.risk].color}`,
          borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', flex: 1 }}>
              {selectedZone.name}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={riskPillStyle(selectedZone.risk)}>{rl[selectedZone.risk]}</span>
              <button onClick={() => setSelectedZone(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, color: '#9ca3af', padding: 0, minHeight: 'auto' }}>×</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            📍 {selectedZone.district}
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 8 }}>
            {selectedZone.description}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: '#f3f4f6', color: '#374151',
              padding: '3px 10px', borderRadius: 99 }}>
              👥 {selectedZone.affected}
            </span>
            <span style={{ fontSize: 12, background: '#f3f4f6', color: '#374151',
              padding: '3px 10px', borderRadius: 99 }}>
              🌊 {lang==='en'?'Flood zone':'Eneo la mafuriko'}
            </span>
          </div>
        </div>
      )}

      {/* All zones list */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        {lang==='en' ? `Flood zones (${visibleZones.length})` : `Maeneo ya mafuriko (${visibleZones.length})`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleZones.map(zone => (
          <button key={zone.id}
            onClick={() => {
              setSelectedZone(zone);
              setMapCenter([
                zone.coordinates.reduce((s,c)=>s+c[0],0)/zone.coordinates.length,
                zone.coordinates.reduce((s,c)=>s+c[1],0)/zone.coordinates.length,
              ]);
              setMapZoom(11);
            }}
            style={{ background: '#fff',
              border: `1px solid ${selectedZone?.id===zone.id ? RISK_COLORS[zone.risk].color : '#e5e7eb'}`,
              borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'left',
              boxShadow: selectedZone?.id===zone.id ? `0 0 0 2px ${RISK_COLORS[zone.risk].fillColor}40` : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{zone.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                📍 {zone.district} · 👥 {zone.affected}
              </div>
            </div>
            <span style={riskPillStyle(zone.risk)}>{rl[zone.risk]}</span>
          </button>
        ))}
      </div>

      {visibleZones.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 14 }}>
          {lang==='en' ? 'No flood zones found for this filter.' : 'Hakuna maeneo ya mafuriko kwa kichujio hiki.'}
        </div>
      )}
    </div>
  );
}
