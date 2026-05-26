import React, { useState, useEffect, useRef } from 'react';

// ─── TRANSLATIONS ─────────────────────────────────────────────────
const LANG = {
  en: {
    appName: 'Climate Health System',
    appSub: 'Tanzania Early Warning Platform',
    live: 'Live',
    home: 'Home', weather: 'Weather', symptoms: 'Symptoms',
    clinics: 'Clinics', map: 'Risk Map', sms: 'SMS',
    welcome: 'Hello 👋',
    welcomeSub: 'Here is today\'s health situation for your district.',
    quickActions: 'Quick actions',
    checkWeather: 'Check Weather', liveforecast: 'Live forecast',
    checkSymptoms: 'Check Symptoms', aiHealth: 'AI health check',
    findClinic: 'Find Clinic', nearbyFacilities: 'Nearby facilities',
    emergency: 'Emergency', call112: 'Call 112',
    callAmbulance: 'Call 112 for ambulance',
    search: 'Search', loading: 'Loading...',
    selectDistrict: 'Select a district and tap Search',
    weatherMonitor: '🌤️ Weather Monitor',
    riskThisWeek: 'Overall risk this period',
    temperature: 'Temperature', feelsLike: 'Feels like',
    humidity: 'Humidity', rainToday: 'Rain today',
    windSpeed: 'Wind Speed', currentWind: 'Current wind',
    sevenDayRain: 'Total Rain', totalForecast: 'Total forecast',
    today: 'Today',
    riskLow: 'Low', riskMedium: 'Medium', riskHigh: 'High', riskEmergency: 'Emergency',
    symptomChecker: '🤒 Symptom Checker',
    afyaGreeting: "Hello! I'm Afya, your health assistant. How are you feeling today?",
    typeSymptoms: 'Describe your symptoms...',
    afyaTyping: 'Afya is typing...',
    connectError: 'Sorry, could not connect. Please try again.',
    nearbyClinics: '🏥 Nearby Clinics',
    riskMap: '🗺️ Risk Map',
    riskMapSub: 'Tanzania — Live health risk by district',
    overallRisk: 'Overall', malaria: 'Malaria', flood: 'Flood', drought: 'Drought',
    allDistricts: 'All districts',
    temp: 'Temp', rain7: 'Rain (7d)', risk: 'Risk',
    smsAlerts: '📲 SMS Alerts',
    smsSub: 'Subscribe to receive health alerts by SMS',
    yourPhone: 'Your phone number (e.g. +255712345678)',
    yourDistrict: 'Your district',
    subscribe: 'Subscribe',
    subscribed: 'Subscribed!',
    subscribedMsg: 'You will receive SMS alerts for',
    unsubscribe: 'Unsubscribe',
    smsInfo: "Alerts sent via Africa's Talking to your phone.",
    alertTypes: 'You will receive alerts for:',
    alertType1: '🌧️ Heavy rain & flood warnings',
    alertType2: '🦟 Malaria & disease outbreak alerts',
    alertType3: '🌡️ Extreme heat warnings',
    alertType4: '🏜️ Drought & water scarcity alerts',
    hospital: 'Hospital', clinic: 'Health centre', dispensary: 'Dispensary',
    currentConditions: '📍 Current conditions',
    forecastCalendar: 'forecast — tap a day for details',
    riskTimeline: '📊 Health risk timeline',
    healthAlerts: '🚨 Health alerts for this period',
    whatToDo: '✅ What to do this period',
    dayDetails: 'Details',
    max: 'Max', min: 'Min', rain: 'Rain',
    days7: '7-day forecast', days15: '15-day forecast',
    overallRiskPeriod: 'Overall risk — next',
    daysLabel: 'days',
    whenToGo: '🚦 When to seek help',
    goNow: 'Go to hospital IMMEDIATELY',
    go24h: 'Visit clinic within 24 HOURS',
    goSoon: 'Book a clinic visit SOON',
    commonSymptoms: 'Common symptoms — tap to add',
    todayAlert: 'Today\'s health alert',
    loadingHome: 'Loading your district data...',
    phone: 'Phone',
    address: 'Address',
    outbreak: 'Outbreak',
  },
  sw: {
    appName: 'Mfumo wa Afya ya Hali ya Hewa',
    appSub: 'Mfumo wa Tahadhari ya Mapema Tanzania',
    live: 'Hai',
    home: 'Nyumbani', weather: 'Hewa', symptoms: 'Dalili',
    clinics: 'Kliniki', map: 'Ramani', sms: 'SMS',
    welcome: 'Karibu 👋',
    welcomeSub: 'Kaa salama na taarifa za kiafya za hali ya hewa kwa wilaya yako.',
    quickActions: 'Vitendo vya haraka',
    checkWeather: 'Utabiri wa Hali ya Hewa', liveforecast: 'Utabiri wa moja kwa moja',
    checkSymptoms: 'Kagua Dalili', aiHealth: 'Ukaguzi wa afya wa AI',
    findClinic: 'Pata Kliniki', nearbyFacilities: 'Vituo vilivyo karibu',
    emergency: 'Dharura', call112: 'Piga 112',
    callAmbulance: 'Piga 112 kwa ambulensi',
    search: 'Tafuta', loading: 'Inapakia...',
    selectDistrict: 'Chagua wilaya na uguse Tafuta',
    weatherMonitor: '🌤️ Ufuatiliaji wa Hali ya Hewa',
    riskThisWeek: 'Hatari kwa ujumla kipindi hiki',
    temperature: 'Joto', feelsLike: 'Inahisi kama',
    humidity: 'Unyevunyevu', rainToday: 'Mvua leo',
    windSpeed: 'Kasi ya Upepo', currentWind: 'Upepo wa sasa',
    sevenDayRain: 'Mvua Yote', totalForecast: 'Jumla ya utabiri',
    today: 'Leo',
    riskLow: 'Chini', riskMedium: 'Kati', riskHigh: 'Juu', riskEmergency: 'Dharura',
    symptomChecker: '🤒 Ukaguzi wa Dalili',
    afyaGreeting: "Habari! Mimi ni Afya, msaidizi wako wa afya. Unajisikiaje leo?",
    typeSymptoms: 'Elezea dalili zako...',
    afyaTyping: 'Afya anaandika...',
    connectError: 'Samahani, hitilafu imetokea. Tafadhali jaribu tena.',
    nearbyClinics: '🏥 Kliniki Zilizo Karibu',
    riskMap: '🗺️ Ramani ya Hatari',
    riskMapSub: 'Tanzania — Hatari za kiafya kwa wilaya',
    overallRisk: 'Kwa Ujumla', malaria: 'Malaria', flood: 'Mafuriko', drought: 'Ukame',
    allDistricts: 'Wilaya zote',
    temp: 'Joto', rain7: 'Mvua (siku 7)', risk: 'Hatari',
    smsAlerts: '📲 Taarifa za SMS',
    smsSub: 'Jiandikishe kupokea taarifa za kiafya kwa SMS',
    yourPhone: 'Nambari yako ya simu (mfano +255712345678)',
    yourDistrict: 'Wilaya yako',
    subscribe: 'Jiandikishe',
    subscribed: 'Umejisajili!',
    subscribedMsg: 'Utapokea taarifa za SMS kwa',
    unsubscribe: 'Jisajili tena',
    smsInfo: "Taarifa zitatumwa kupitia Africa's Talking kwenye simu yako.",
    alertTypes: 'Utapokea taarifa za:',
    alertType1: '🌧️ Mvua nzito na onyo la mafuriko',
    alertType2: '🦟 Mlipuko wa malaria na magonjwa',
    alertType3: '🌡️ Onyo la joto kali',
    alertType4: '🏜️ Ukame na upungufu wa maji',
    hospital: 'Hospitali', clinic: 'Kituo cha afya', dispensary: 'Zahanati',
    currentConditions: '📍 Hali ya sasa',
    forecastCalendar: 'utabiri — gusa siku kwa maelezo',
    riskTimeline: '📊 Mstari wa hatari za afya',
    healthAlerts: '🚨 Tahadhari za kiafya kipindi hiki',
    whatToDo: '✅ Nini cha kufanya kipindi hiki',
    dayDetails: 'Maelezo',
    max: 'Juu', min: 'Chini', rain: 'Mvua',
    days7: 'Utabiri siku 7', days15: 'Utabiri siku 15',
    overallRiskPeriod: 'Hatari kwa ujumla — siku',
    daysLabel: 'zijazo',
    whenToGo: '🚦 Lini kutafuta msaada',
    goNow: 'Nenda hospitali MARA MOJA',
    go24h: 'Tembelea kliniki ndani ya MASAA 24',
    goSoon: 'Panga ziara ya kliniki HIVI KARIBUNI',
    commonSymptoms: 'Dalili za kawaida — gusa kuongeza',
    todayAlert: 'Tahadhari ya leo',
    loadingHome: 'Inapakia data ya wilaya yako...',
    phone: 'Simu',
    address: 'Anwani',
    outbreak: 'Mlipuko',
  }
};

// ─── DATA ─────────────────────────────────────────────────────────
const DISTRICTS = [
  // Mainland Tanzania (26 regions)
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa',
  'Kagera','Katavi','Kigoma','Kilimanjaro','Lindi',
  'Manyara','Mara','Mbeya','Morogoro','Moshi',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa',
  'Ruvuma','Shinyanga','Simiyu','Singida','Songea',
  'Tabora','Tanga',
  // Zanzibar (5 regions)
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South',
];

const DISTRICT_COORDS = {
  // Mainland
  'Arusha':{lat:-3.3869,lon:36.683},
  'Dar es Salaam':{lat:-6.7924,lon:39.2083},
  'Dodoma':{lat:-6.1722,lon:35.7395},
  'Geita':{lat:-2.8699,lon:32.2317},
  'Iringa':{lat:-7.77,lon:35.69},
  'Kagera':{lat:-1.4967,lon:31.3701},
  'Katavi':{lat:-6.8367,lon:31.1378},
  'Kigoma':{lat:-4.8833,lon:29.6333},
  'Kilimanjaro':{lat:-3.35,lon:37.3333},
  'Lindi':{lat:-9.9989,lon:39.7144},
  'Manyara':{lat:-3.6133,lon:35.8903},
  'Mara':{lat:-1.7667,lon:34.0},
  'Mbeya':{lat:-8.9094,lon:33.4607},
  'Morogoro':{lat:-6.8218,lon:37.6619},
  'Moshi':{lat:-3.35,lon:37.3333},
  'Mtwara':{lat:-10.2667,lon:40.1833},
  'Mwanza':{lat:-2.5164,lon:32.9175},
  'Njombe':{lat:-9.3333,lon:34.7667},
  'Pwani':{lat:-7.0,lon:38.5},
  'Rukwa':{lat:-7.9833,lon:32.0333},
  'Ruvuma':{lat:-10.6833,lon:35.65},
  'Shinyanga':{lat:-3.6636,lon:33.423},
  'Simiyu':{lat:-2.85,lon:34.15},
  'Singida':{lat:-4.8189,lon:34.7484},
  'Songea':{lat:-10.6833,lon:35.65},
  'Tabora':{lat:-5.0167,lon:32.8},
  'Tanga':{lat:-5.0688,lon:39.0987},
  // Zanzibar
  'Zanzibar North':{lat:-5.7304,lon:39.4114},
  'Zanzibar South':{lat:-6.2833,lon:39.5167},
  'Zanzibar West':{lat:-6.1659,lon:39.2026},
  'Pemba North':{lat:-5.0333,lon:39.7667},
  'Pemba South':{lat:-5.3167,lon:39.75},
};

// ─── GPS LOCATION DETECTION ───────────────────────────────────────
function findNearestDistrict(lat, lon) {
  let nearest = 'Dar es Salaam';
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(DISTRICT_COORDS)) {
    const dist = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }
  return nearest;
}

function useGPSLocation(onFound, onError) {
  if (!navigator.geolocation) {
    onError('GPS not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const district = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
      onFound(district, pos.coords.latitude, pos.coords.longitude);
    },
    (err) => onError(err.message),
    { timeout: 8000, maximumAge: 300000 }
  );
}



const CLINICS_DATA = {
  'Iringa':[
    {name:'Iringa Regional Referral Hospital',type:'hospital',phone:'+255 262 702 285',address:'Iringa Town Centre',hours:'24/7'},
    {name:'Tosamaganga Hospital',type:'hospital',phone:'+255 262 702 100',address:'Tosamaganga, 10km from Iringa',hours:'24/7'},
    {name:'Iringa Urban Health Centre',type:'clinic',phone:'+255 262 702 300',address:'Iringa Urban District',hours:'7am-9pm'},
    {name:"Kidd's Camp Dispensary",type:'dispensary',phone:'+255 262 702 400',address:'Ruaha area, Iringa',hours:'7am-5pm'},
  ],
  'Dar es Salaam':[
    {name:'Muhimbili National Hospital',type:'hospital',phone:'+255 222 150 610',address:'United Nations Rd, Upanga',hours:'24/7'},
    {name:'Amana Regional Hospital',type:'hospital',phone:'+255 222 861 810',address:'Ilala, Dar es Salaam',hours:'24/7'},
    {name:'Mwananyamala Regional Hospital',type:'hospital',phone:'+255 222 280 338',address:'Kinondoni, Dar es Salaam',hours:'24/7'},
    {name:'Temeke District Hospital',type:'hospital',phone:'+255 222 851 284',address:'Temeke District',hours:'24/7'},
    {name:'Sinza Community Health Centre',type:'clinic',phone:'+255 222 280 100',address:'Sinza, Kinondoni',hours:'7am-10pm'},
  ],
  'Dodoma':[
    {name:'Benjamin Mkapa Hospital',type:'hospital',phone:'+255 262 321 666',address:'Dodoma City Centre',hours:'24/7'},
    {name:'Dodoma Regional Hospital',type:'hospital',phone:'+255 262 321 234',address:'Dodoma',hours:'24/7'},
    {name:'Nzuguni Health Centre',type:'clinic',phone:'+255 262 320 500',address:'Nzuguni, Dodoma',hours:'7am-8pm'},
  ],
  'Geita':[
    {name:'Geita District Hospital',type:'hospital',phone:'+255 282 270 013',address:'Geita Town',hours:'24/7'},
    {name:'Chato District Hospital',type:'hospital',phone:'+255 282 280 012',address:'Chato, Geita',hours:'24/7'},
    {name:'Geita Health Centre',type:'clinic',phone:'+255 282 270 100',address:'Geita Town',hours:'7am-8pm'},
  ],
  'Arusha':[
    {name:'Mount Meru Regional Hospital',type:'hospital',phone:'+255 272 508 321',address:'Arusha City Centre',hours:'24/7'},
    {name:'Arusha Lutheran Medical Centre',type:'hospital',phone:'+255 272 553 338',address:'Nkoaranga, Arusha',hours:'24/7'},
    {name:'Selian Lutheran Hospital',type:'hospital',phone:'+255 272 509 630',address:'Arusha, off Nairobi Road',hours:'24/7'},
    {name:'Arusha Urban Health Centre',type:'clinic',phone:'+255 272 507 100',address:'Arusha Town',hours:'7am-9pm'},
  ],
  'Kagera':[
    {name:'Kagera Regional Referral Hospital',type:'hospital',phone:'+255 282 222 393',address:'Bukoba Town',hours:'24/7'},
    {name:'Bukoba District Hospital',type:'hospital',phone:'+255 282 222 200',address:'Bukoba, Kagera',hours:'24/7'},
    {name:'Ndolage Hospital',type:'hospital',phone:'+255 282 236 013',address:'Ndolage, Kagera',hours:'24/7'},
    {name:'Bukoba Urban Health Centre',type:'clinic',phone:'+255 282 222 100',address:'Bukoba Town',hours:'7am-8pm'},
  ],
  'Katavi':[
    {name:'Mpanda Regional Hospital',type:'hospital',phone:'+255 252 702 231',address:'Mpanda Town',hours:'24/7'},
    {name:'Mpanda District Hospital',type:'hospital',phone:'+255 252 702 200',address:'Mpanda District',hours:'24/7'},
    {name:'Mlele Health Centre',type:'clinic',phone:'+255 252 720 012',address:'Mlele, Katavi',hours:'7am-6pm'},
  ],
  'Kigoma':[
    {name:'Maweni Regional Hospital',type:'hospital',phone:'+255 282 802 346',address:'Kigoma Town',hours:'24/7'},
    {name:'Kigoma District Hospital',type:'hospital',phone:'+255 282 802 200',address:'Kigoma District',hours:'24/7'},
    {name:'Kibondo District Hospital',type:'hospital',phone:'+255 282 831 012',address:'Kibondo, Kigoma',hours:'24/7'},
    {name:'Kasulu District Hospital',type:'hospital',phone:'+255 282 840 023',address:'Kasulu, Kigoma',hours:'24/7'},
    {name:'Kigoma Urban Health Centre',type:'clinic',phone:'+255 282 802 100',address:'Kigoma Town',hours:'7am-8pm'},
  ],
  'Kilimanjaro':[
    {name:'KCMC Hospital',type:'hospital',phone:'+255 272 754 377',address:'Moshi, Kilimanjaro',hours:'24/7'},
    {name:'Moshi District Hospital',type:'hospital',phone:'+255 272 752 131',address:'Moshi Town',hours:'24/7'},
    {name:'Hai District Hospital',type:'hospital',phone:'+255 272 756 004',address:'Boma Ngombe, Kilimanjaro',hours:'24/7'},
    {name:'Same District Hospital',type:'hospital',phone:'+255 272 275 011',address:'Same, Kilimanjaro',hours:'24/7'},
    {name:'Moshi Urban Health Centre',type:'clinic',phone:'+255 272 752 200',address:'Moshi Town',hours:'7am-9pm'},
  ],
  'Moshi':[
    {name:'KCMC Hospital',type:'hospital',phone:'+255 272 754 377',address:'Moshi, Kilimanjaro',hours:'24/7'},
    {name:'Moshi District Hospital',type:'hospital',phone:'+255 272 752 131',address:'Moshi Town',hours:'24/7'},
    {name:'Moshi Urban Health Centre',type:'clinic',phone:'+255 272 752 200',address:'Moshi Town',hours:'7am-9pm'},
  ],
  'Lindi':[
    {name:'Lindi Regional Referral Hospital',type:'hospital',phone:'+255 232 202 350',address:'Lindi Town',hours:'24/7'},
    {name:'Lindi District Hospital',type:'hospital',phone:'+255 232 202 200',address:'Lindi District',hours:'24/7'},
    {name:'Liwale District Hospital',type:'hospital',phone:'+255 232 231 012',address:'Liwale, Lindi',hours:'24/7'},
    {name:'Lindi Urban Health Centre',type:'clinic',phone:'+255 232 202 100',address:'Lindi Town',hours:'7am-8pm'},
  ],
  'Manyara':[
    {name:'Manyara Regional Hospital',type:'hospital',phone:'+255 272 702 310',address:'Babati Town',hours:'24/7'},
    {name:'Babati District Hospital',type:'hospital',phone:'+255 272 702 200',address:'Babati, Manyara',hours:'24/7'},
    {name:'Mbulu District Hospital',type:'hospital',phone:'+255 272 760 014',address:'Mbulu, Manyara',hours:'24/7'},
    {name:'Hanang District Hospital',type:'hospital',phone:'+255 272 780 013',address:'Hanang, Manyara',hours:'24/7'},
    {name:'Babati Health Centre',type:'clinic',phone:'+255 272 702 100',address:'Babati Town',hours:'7am-8pm'},
  ],
  'Mara':[
    {name:'Mara Regional Hospital',type:'hospital',phone:'+255 282 702 291',address:'Musoma Town',hours:'24/7'},
    {name:'Musoma District Hospital',type:'hospital',phone:'+255 282 702 200',address:'Musoma, Mara',hours:'24/7'},
    {name:'Tarime District Hospital',type:'hospital',phone:'+255 282 740 013',address:'Tarime, Mara',hours:'24/7'},
    {name:'Shirati Hospital',type:'hospital',phone:'+255 282 760 020',address:'Shirati, Mara',hours:'24/7'},
    {name:'Musoma Urban Health Centre',type:'clinic',phone:'+255 282 702 100',address:'Musoma Town',hours:'7am-8pm'},
  ],
  'Mbeya':[
    {name:'Mbeya Zonal Referral Hospital',type:'hospital',phone:'+255 252 503 600',address:'Mbeya City',hours:'24/7'},
    {name:'Mbeya Regional Hospital',type:'hospital',phone:'+255 252 503 500',address:'Mbeya',hours:'24/7'},
    {name:'Iyunga Health Centre',type:'clinic',phone:'+255 252 503 200',address:'Iyunga, Mbeya',hours:'7am-8pm'},
    {name:'Mbalizi Hospital',type:'hospital',phone:'+255 252 503 700',address:'Mbalizi, Mbeya',hours:'24/7'},
  ],
  'Morogoro':[
    {name:'Morogoro Regional Referral Hospital',type:'hospital',phone:'+255 232 604 611',address:'Morogoro Town Centre',hours:'24/7'},
    {name:'Kilosa District Hospital',type:'hospital',phone:'+255 232 640 015',address:'Kilosa, Morogoro',hours:'24/7'},
    {name:'Mvomero District Hospital',type:'hospital',phone:'+255 232 650 011',address:'Mvomero, Morogoro',hours:'24/7'},
    {name:'Morogoro Urban Health Centre',type:'clinic',phone:'+255 232 604 300',address:'Morogoro Town',hours:'7am-9pm'},
  ],
  'Mtwara':[
    {name:'Mtwara Regional Referral Hospital',type:'hospital',phone:'+255 232 333 540',address:'Mtwara Town',hours:'24/7'},
    {name:'Masasi District Hospital',type:'hospital',phone:'+255 232 350 014',address:'Masasi, Mtwara',hours:'24/7'},
    {name:'Newala District Hospital',type:'hospital',phone:'+255 232 360 012',address:'Newala, Mtwara',hours:'24/7'},
    {name:'Nanyamba Health Centre',type:'clinic',phone:'+255 232 333 200',address:'Nanyamba, Mtwara',hours:'7am-8pm'},
  ],
  'Mwanza':[
    {name:'Bugando Medical Centre',type:'hospital',phone:'+255 282 500 611',address:'Bugando Hill, Mwanza',hours:'24/7'},
    {name:'Mwanza Regional Hospital',type:'hospital',phone:'+255 282 500 100',address:'Mwanza City',hours:'24/7'},
    {name:'Nyamagana District Hospital',type:'hospital',phone:'+255 282 500 200',address:'Nyamagana, Mwanza',hours:'24/7'},
    {name:'Sengerema District Hospital',type:'hospital',phone:'+255 282 560 013',address:'Sengerema, Mwanza',hours:'24/7'},
    {name:'Mwanza Urban Health Centre',type:'clinic',phone:'+255 282 500 300',address:'Mwanza City',hours:'7am-9pm'},
  ],
  'Njombe':[
    {name:'Njombe Regional Hospital',type:'hospital',phone:'+255 262 782 310',address:'Njombe Town',hours:'24/7'},
    {name:'Njombe District Hospital',type:'hospital',phone:'+255 262 782 200',address:'Njombe District',hours:'24/7'},
    {name:'Makambako Health Centre',type:'clinic',phone:'+255 262 782 100',address:'Makambako, Njombe',hours:'7am-8pm'},
    {name:'Ludewa District Hospital',type:'hospital',phone:'+255 262 790 012',address:'Ludewa, Njombe',hours:'24/7'},
  ],
  'Pwani':[
    {name:'Tumbi Regional Hospital',type:'hospital',phone:'+255 232 402 300',address:'Kibaha, Pwani',hours:'24/7'},
    {name:'Kibaha District Hospital',type:'hospital',phone:'+255 232 402 200',address:'Kibaha, Pwani',hours:'24/7'},
    {name:'Bagamoyo District Hospital',type:'hospital',phone:'+255 232 440 013',address:'Bagamoyo, Pwani',hours:'24/7'},
    {name:'Kibiti Health Centre',type:'clinic',phone:'+255 232 402 100',address:'Kibiti, Pwani',hours:'7am-8pm'},
  ],
  'Rukwa':[
    {name:'Sumbawanga Regional Referral Hospital',type:'hospital',phone:'+255 252 802 310',address:'Sumbawanga Town',hours:'24/7'},
    {name:'Sumbawanga District Hospital',type:'hospital',phone:'+255 252 802 200',address:'Sumbawanga District',hours:'24/7'},
    {name:'Nkasi District Hospital',type:'hospital',phone:'+255 252 820 012',address:'Nkasi, Rukwa',hours:'24/7'},
    {name:'Sumbawanga Urban Health Centre',type:'clinic',phone:'+255 252 802 100',address:'Sumbawanga Town',hours:'7am-8pm'},
  ],
  'Ruvuma':[
    {name:'Songea Regional Referral Hospital',type:'hospital',phone:'+255 252 602 380',address:'Songea Town',hours:'24/7'},
    {name:'Songea District Hospital',type:'hospital',phone:'+255 252 602 200',address:'Songea District',hours:'24/7'},
    {name:'Mbinga District Hospital',type:'hospital',phone:'+255 252 640 015',address:'Mbinga, Ruvuma',hours:'24/7'},
    {name:'Tunduru District Hospital',type:'hospital',phone:'+255 252 620 014',address:'Tunduru, Ruvuma',hours:'24/7'},
    {name:'Songea Urban Health Centre',type:'clinic',phone:'+255 252 602 100',address:'Songea Town',hours:'7am-8pm'},
  ],
  'Songea':[
    {name:'Songea Regional Referral Hospital',type:'hospital',phone:'+255 252 602 380',address:'Songea Town',hours:'24/7'},
    {name:'Songea District Hospital',type:'hospital',phone:'+255 252 602 200',address:'Songea District',hours:'24/7'},
    {name:'Songea Urban Health Centre',type:'clinic',phone:'+255 252 602 100',address:'Songea Town',hours:'7am-8pm'},
  ],
  'Shinyanga':[
    {name:'Shinyanga Regional Referral Hospital',type:'hospital',phone:'+255 276 402 290',address:'Shinyanga Town',hours:'24/7'},
    {name:'Shinyanga District Hospital',type:'hospital',phone:'+255 276 402 200',address:'Shinyanga District',hours:'24/7'},
    {name:'Kahama District Hospital',type:'hospital',phone:'+255 276 450 013',address:'Kahama, Shinyanga',hours:'24/7'},
    {name:'Shinyanga Urban Health Centre',type:'clinic',phone:'+255 276 402 100',address:'Shinyanga Town',hours:'7am-8pm'},
  ],
  'Simiyu':[
    {name:'Bariadi Regional Hospital',type:'hospital',phone:'+255 282 902 310',address:'Bariadi Town',hours:'24/7'},
    {name:'Bariadi District Hospital',type:'hospital',phone:'+255 282 902 200',address:'Bariadi, Simiyu',hours:'24/7'},
    {name:'Maswa District Hospital',type:'hospital',phone:'+255 282 920 012',address:'Maswa, Simiyu',hours:'24/7'},
    {name:'Bariadi Health Centre',type:'clinic',phone:'+255 282 902 100',address:'Bariadi Town',hours:'7am-8pm'},
  ],
  'Singida':[
    {name:'Singida Regional Referral Hospital',type:'hospital',phone:'+255 262 502 230',address:'Singida Town',hours:'24/7'},
    {name:'Singida District Hospital',type:'hospital',phone:'+255 262 502 200',address:'Singida District',hours:'24/7'},
    {name:'Manyoni District Hospital',type:'hospital',phone:'+255 262 530 012',address:'Manyoni, Singida',hours:'24/7'},
    {name:'Singida Urban Health Centre',type:'clinic',phone:'+255 262 502 100',address:'Singida Town',hours:'7am-8pm'},
  ],
  'Tabora':[
    {name:'Tabora Regional Referral Hospital',type:'hospital',phone:'+255 262 604 390',address:'Tabora Town Centre',hours:'24/7'},
    {name:'Tabora District Hospital',type:'hospital',phone:'+255 262 604 200',address:'Tabora District',hours:'24/7'},
    {name:'Igunga District Hospital',type:'hospital',phone:'+255 262 670 012',address:'Igunga, Tabora',hours:'24/7'},
    {name:'Nzega District Hospital',type:'hospital',phone:'+255 262 654 015',address:'Nzega, Tabora',hours:'24/7'},
    {name:'Urambo District Hospital',type:'hospital',phone:'+255 262 660 011',address:'Urambo, Tabora',hours:'24/7'},
    {name:'Tabora Urban Health Centre',type:'clinic',phone:'+255 262 604 100',address:'Tabora Urban',hours:'7am-8pm'},
  ],
  'Tanga':[
    {name:'Bombo Regional Hospital',type:'hospital',phone:'+255 272 643 351',address:'Tanga City',hours:'24/7'},
    {name:'Muheza District Hospital',type:'hospital',phone:'+255 272 640 022',address:'Muheza, Tanga',hours:'24/7'},
    {name:'Korogwe District Hospital',type:'hospital',phone:'+255 272 660 013',address:'Korogwe, Tanga',hours:'24/7'},
    {name:'Handeni District Hospital',type:'hospital',phone:'+255 272 670 014',address:'Handeni, Tanga',hours:'24/7'},
    {name:'Tanga Urban Health Centre',type:'clinic',phone:'+255 272 643 100',address:'Tanga Urban',hours:'7am-9pm'},
  ],
  // Zanzibar regions
  'Zanzibar West':[
    {name:'Mnazi Mmoja Hospital',type:'hospital',phone:'+255 242 230 820',address:'Stone Town, Zanzibar',hours:'24/7'},
    {name:'Mwanakwerekwe Health Centre',type:'clinic',phone:'+255 242 230 500',address:'Mwanakwerekwe, Zanzibar',hours:'7am-9pm'},
    {name:'Magomeni Dispensary',type:'dispensary',phone:'+255 242 230 300',address:'Magomeni, Stone Town',hours:'7am-6pm'},
  ],
  'Zanzibar North':[
    {name:'Kivunge Hospital',type:'hospital',phone:'+255 242 234 100',address:'Kivunge, North A',hours:'24/7'},
    {name:'Matemwe Health Centre',type:'clinic',phone:'+255 242 234 200',address:'Matemwe, North B',hours:'7am-8pm'},
    {name:'Nungwi Dispensary',type:'dispensary',phone:'+255 242 234 300',address:'Nungwi, North B',hours:'7am-5pm'},
  ],
  'Zanzibar South':[
    {name:'Makunduchi Hospital',type:'hospital',phone:'+255 242 231 500',address:'Makunduchi, South',hours:'24/7'},
    {name:'Muyuni Health Centre',type:'clinic',phone:'+255 242 231 200',address:'Muyuni, South',hours:'7am-8pm'},
    {name:'Kizimkazi Dispensary',type:'dispensary',phone:'+255 242 231 300',address:'Kizimkazi, South',hours:'7am-5pm'},
  ],
  'Pemba North':[
    {name:'Chake Chake Hospital',type:'hospital',phone:'+255 242 452 101',address:'Chake Chake, Pemba',hours:'24/7'},
    {name:'Wete District Hospital',type:'hospital',phone:'+255 242 454 101',address:'Wete, Pemba North',hours:'24/7'},
    {name:'Wete Health Centre',type:'clinic',phone:'+255 242 454 200',address:'Wete, Pemba',hours:'7am-8pm'},
  ],
  'Pemba South':[
    {name:'Mkoani District Hospital',type:'hospital',phone:'+255 242 456 101',address:'Mkoani, Pemba South',hours:'24/7'},
    {name:'Mkoani Health Centre',type:'clinic',phone:'+255 242 456 200',address:'Mkoani, Pemba',hours:'7am-8pm'},
    {name:'Micheweni Dispensary',type:'dispensary',phone:'+255 242 456 300',address:'Micheweni, Pemba',hours:'7am-5pm'},
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────
const RISK_COLORS = {
  low:      {bg:'#f0fdf4',border:'#bbf7d0',text:'#166534',dot:'#22c55e'},
  medium:   {bg:'#fffbeb',border:'#fde68a',text:'#92400e',dot:'#f59e0b'},
  high:     {bg:'#fef2f2',border:'#fecaca',text:'#991b1b',dot:'#ef4444'},
  emergency:{bg:'#fef2f2',border:'#f87171',text:'#7f1d1d',dot:'#7f1d1d'},
  loading:  {bg:'#f9fafb',border:'#e5e7eb',text:'#9ca3af',dot:'#d1d5db'},
};

function getDayRisk(maxTemp,rain,wcode){
  if(wcode>=95) return 'emergency';
  if(rain>20)   return 'high';
  if(rain>8||maxTemp>36) return 'medium';
  return 'low';
}

function getRiskLabel(r,t){
  return {low:t.riskLow,medium:t.riskMedium,high:t.riskHigh,emergency:t.riskEmergency,loading:'...'}[r]||'...';
}

function getIcon(code){
  if(code===0) return '☀️';
  if(code<=2)  return '⛅';
  if(code===3) return '☁️';
  if(code<=48) return '🌫️';
  if(code<=65) return '🌧️';
  if(code<=81) return '🌦️';
  return '⛈️';
}

function RiskPill({risk,label}){
  const c=RISK_COLORS[risk]||RISK_COLORS.loading;
  return(
    <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,
      padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>{label}</span>
  );
}

async function fetchWeatherData(district,days=7){
  const coords=DISTRICT_COORDS[district];
  if(!coords) return null;
  const url=
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}`+
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation`+
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code`+
    `&timezone=Africa%2FDar_es_Salaam&forecast_days=${days}`;
  const res=await fetch(url);
  return res.json();
}

function buildAlerts(daily,lang){
  const dayNames_en=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayNames_sw=['Jum','Jtn','Jmm','Alh','Ijm','Jmo','Jpi'];
  const dayNames=lang==='en'?dayNames_en:dayNames_sw;
  const today=lang==='en'?'Today':'Leo';
  const dn=(i)=>i===0?today:dayNames[new Date(daily.time[i]).getDay()];

  const stormDays=daily.weather_code.map((c,i)=>c>=95?dn(i):null).filter(Boolean);
  const rainDays=daily.precipitation_sum.map((r,i)=>r>10?dn(i):null).filter(Boolean);
  const hotDays=daily.temperature_2m_max.map((m,i)=>m>36?dn(i):null).filter(Boolean);
  const totalRain=daily.precipitation_sum.reduce((a,b)=>a+b,0);
  const isDrought=totalRain<3&&daily.temperature_2m_max[0]>32;

  const alerts=[];

  if(stormDays.length) alerts.push({
    level:'emergency',icon:'⛈️',
    title:lang==='en'?'Severe weather warning':'Onyo la hali mbaya ya hewa',
    body:lang==='en'
      ?`Thunderstorms expected on ${stormDays.join(', ')}. Stay indoors, avoid open fields and tall trees.`
      :`Radi inatarajiwa ${stormDays.join(', ')}. Kaa ndani, epuka maeneo wazi na miti mirefu.`,
    days:stormDays,
  });

  if(rainDays.length){
    alerts.push({
      level:'high',icon:'🦟',
      title:lang==='en'?'Malaria risk elevated':'Hatari ya malaria imeongezeka',
      body:lang==='en'
        ?`Heavy rainfall on ${rainDays.join(', ')} creates mosquito breeding grounds. Sleep under nets every night and seek care immediately for any fever.`
        :`Mvua nzito ${rainDays.join(', ')} inaunda mazao ya mbu. Lala chini ya neti kila usiku na tafuta matibabu haraka kwa homa yoyote.`,
      days:rainDays,
    });
    alerts.push({
      level:'high',icon:'💧',
      title:lang==='en'?'Waterborne disease risk':'Hatari ya magonjwa ya maji',
      body:lang==='en'
        ?`Rain on ${rainDays.join(', ')} may contaminate open water. Drink only boiled or treated water.`
        :`Mvua ${rainDays.join(', ')} inaweza kuchafua maji wazi. Kunywa maji yaliyochemshwa tu.`,
      days:rainDays,
    });
  }

  if(hotDays.length) alerts.push({
    level:'medium',icon:'🌡️',
    title:lang==='en'?'Heat illness warning':'Onyo la ugonjwa wa joto',
    body:lang==='en'
      ?`High temperatures on ${hotDays.join(', ')}. Drink 2–3 litres of water daily, avoid midday sun.`
      :`Joto kali ${hotDays.join(', ')}. Kunywa lita 2–3 za maji kila siku, epuka jua la mchana.`,
    days:hotDays,
  });

  if(isDrought) alerts.push({
    level:'medium',icon:'🏜️',
    title:lang==='en'?'Water scarcity alert':'Tahadhari ya upungufu wa maji',
    body:lang==='en'
      ?'Very little rainfall this period. Conserve and treat all drinking water.'
      :'Mvua ndogo sana kipindi hiki. Hifadhi na tibu maji yote ya kunywa.',
    days:[],
  });

  if(!alerts.length) alerts.push({
    level:'low',icon:'✅',
    title:lang==='en'?'No major health risks detected':'Hakuna hatari kubwa za kiafya',
    body:lang==='en'
      ?'Conditions are relatively safe. Continue standard precautions.'
      :'Hali ni salama kiasi. Endelea na tahadhari za kawaida.',
    days:[],
  });

  return alerts;
}

function buildAdvice(daily,lang){
  const totalRain=daily.precipitation_sum.reduce((a,b)=>a+b,0);
  const hasStorm=daily.weather_code.some(c=>c>=95);
  const hasHeat=daily.temperature_2m_max.some(m=>m>36);
  const key=hasStorm?'storm':totalRain>8?'rain':hasHeat?'heat':'normal';
  const tips={
    en:{
      rain:['Sleep under a mosquito net every night.','Boil or treat all drinking water.','Drain standing water around your home.','Seek care early if fever develops within 2 weeks.','Keep children and elderly indoors during heavy rain.'],
      heat:['Drink at least 2–3 litres of clean water daily.','Avoid outdoor activity between 11am and 3pm.','Wear light, loose-fitting clothing.','Check on elderly neighbours and young children.'],
      storm:['Stay indoors during thunderstorms.','Avoid open water and tall trees.','Prepare emergency kit with water and medication.','Do not cross flooded roads or rivers.'],
      normal:['Maintain good hand hygiene.','Sleep under mosquito nets as a precaution.','Ensure food is well cooked and stored safely.','Stay updated on local health advisories.'],
    },
    sw:{
      rain:['Lala chini ya neti ya mbu kila usiku.','Chemsha au tibu maji yote ya kunywa.','Ondoa maji yaliyosimama karibu na nyumba yako.','Tafuta matibabu mapema ukipata homa ndani ya wiki 2.','Weka watoto na wazee ndani wakati wa mvua nzito.'],
      heat:['Kunywa angalau lita 2–3 za maji safi kila siku.','Epuka shughuli za nje kati ya saa 5 asubuhi na saa 9 mchana.','Vaa nguo nyepesi.','Angalia majirani wazee na watoto wadogo.'],
      storm:['Kaa ndani wakati wa radi.','Epuka maji wazi na miti mirefu.','Andaa vifaa vya dharura pamoja na maji na dawa.','Usivuke barabara au mito yenye mafuriko.'],
      normal:['Dumisha usafi wa mikono.','Lala chini ya neti za mbu kama tahadhari.','Hakikisha chakula kimepikwa vizuri.','Endelea kupata taarifa za afya za hapa kwako.'],
    },
  };
  return tips[lang][key];
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState('home');
  const [lang,setLang]=useState('en');
  const t=LANG[lang];

  const tabs=[
    {id:'home',icon:'🏠',key:'home'},
    {id:'weather',icon:'🌤️',key:'weather'},
    {id:'symptoms',icon:'🤒',key:'symptoms'},
    {id:'clinics',icon:'🏥',key:'clinics'},
    {id:'map',icon:'🗺️',key:'map'},
    {id:'sms',icon:'📲',key:'sms'},
  ];

  return(
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',
      display:'flex',flexDirection:'column',background:'#f9fafb'}}>

      <div style={{background:'#2563eb',color:'#fff',padding:'12px 16px',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>{t.appName}</div>
          <div style={{fontSize:10,opacity:0.8}}>{t.appSub}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{fontSize:10,background:'rgba(255,255,255,0.2)',
            padding:'3px 10px',borderRadius:99}}>🟢 {t.live}</div>
          <button onClick={()=>setLang(l=>l==='en'?'sw':'en')}
            style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',
              padding:'4px 10px',borderRadius:99,cursor:'pointer',fontSize:12,fontWeight:600}}>
            {lang==='en'?'SW':'EN'}
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',paddingBottom:72}}>
        {page==='home'     && <Home setPage={setPage} t={t} lang={lang}/>}
        {page==='weather'  && <Weather t={t} lang={lang}/>}
        {page==='symptoms' && <Symptoms t={t} lang={lang}/>}
        {page==='clinics'  && <Clinics t={t} lang={lang}/>}
        {page==='map'      && <RiskMap t={t} lang={lang}/>}
        {page==='sms'      && <SMSAlerts t={t}/>}
      </div>

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:480,background:'#fff',borderTop:'1px solid #e5e7eb',
        display:'flex',zIndex:100}}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>setPage(tab.id)}
            style={{flex:1,padding:'8px 2px',border:'none',background:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:2,
              borderTop:page===tab.id?'2px solid #2563eb':'2px solid transparent'}}>
            <span style={{fontSize:18}}>{tab.icon}</span>
            <span style={{fontSize:9,fontWeight:500,
              color:page===tab.id?'#2563eb':'#9ca3af'}}>{t[tab.key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME (with live weather + alerts + GPS) ─────────────────────
function Home({setPage,t,lang}){
  const [homeDistrict,setHomeDistrict]=useState('Iringa');
  const [weatherData,setWeatherData]=useState(null);
  const [loadingHome,setLoadingHome]=useState(true);
  const [gpsStatus,setGpsStatus]=useState('detecting'); // detecting, found, denied, error
  const [gpsCoords,setGpsCoords]=useState(null);

  // Try GPS on first load
  useEffect(()=>{
    setGpsStatus('detecting');
    useGPSLocation(
      (district, lat, lon)=>{
        setHomeDistrict(district);
        setGpsCoords({lat,lon});
        setGpsStatus('found');
      },
      ()=>{
        setGpsStatus('denied');
      }
    );
  },[]);

  useEffect(()=>{
    async function load(){
      setLoadingHome(true);
      setWeatherData(null);
      try{ setWeatherData(await fetchWeatherData(homeDistrict,7)); }
      catch(e){}
      setLoadingHome(false);
    }
    load();
  },[homeDistrict]);

  const totalRain=weatherData?.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
  const maxTemp=weatherData?Math.max(...(weatherData.daily?.temperature_2m_max||[0])):0;
  const hasStorm=weatherData?.daily?.weather_code?.some(c=>c>=95)||false;
  const overallRisk=weatherData?getDayRisk(maxTemp,totalRain/7*7,hasStorm):'loading';
  const rc=RISK_COLORS[overallRisk];
  const alerts=weatherData?buildAlerts(weatherData.daily,lang):[];
  const topAlert=alerts[0];

  return(
    <div style={{padding:16}}>

      {/* Welcome message */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:20,fontWeight:700,color:'#111'}}>{t.welcome}</div>
        <div style={{fontSize:13,color:'#6b7280',marginTop:2}}>{t.welcomeSub}</div>
      </div>

      {/* GPS status + District selector */}
      <div style={{marginBottom:12}}>
        {gpsStatus==='detecting'&&(
          <div style={{display:'flex',alignItems:'center',gap:8,
            background:'#eff6ff',border:'1px solid #bfdbfe',
            borderRadius:10,padding:'8px 12px',marginBottom:8}}>
            <div style={{width:14,height:14,border:'2px solid #bfdbfe',
              borderTopColor:'#2563eb',borderRadius:'50%',
              animation:'spin 0.7s linear infinite',flexShrink:0}}/>
            <span style={{fontSize:12,color:'#2563eb'}}>
              {lang==='en'?'Detecting your location...':'Inatafuta mahali ulipo...'}
            </span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {gpsStatus==='found'&&(
          <div style={{display:'flex',alignItems:'center',gap:8,
            background:'#f0fdf4',border:'1px solid #bbf7d0',
            borderRadius:10,padding:'8px 12px',marginBottom:8}}>
            <span style={{fontSize:14}}>📍</span>
            <span style={{fontSize:12,color:'#166534',flex:1}}>
              {lang==='en'
                ?`Location detected: ${homeDistrict}`
                :`Mahali kumegunduliwa: ${homeDistrict}`}
            </span>
            <span style={{fontSize:11,color:'#166534',opacity:0.7}}>GPS ✓</span>
          </div>
        )}
        {gpsStatus==='denied'&&(
          <div style={{display:'flex',alignItems:'center',gap:8,
            background:'#fffbeb',border:'1px solid #fde68a',
            borderRadius:10,padding:'8px 12px',marginBottom:8}}>
            <span style={{fontSize:14}}>⚠️</span>
            <span style={{fontSize:12,color:'#92400e'}}>
              {lang==='en'
                ?'Location access denied. Please select your district below.'
                :'Ruhusa ya mahali imekataliwa. Tafadhali chagua wilaya yako hapa chini.'}
            </span>
          </div>
        )}
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={homeDistrict} onChange={e=>{setHomeDistrict(e.target.value);setGpsStatus('manual');}}
            style={{flex:1,padding:'8px 12px',borderRadius:10,
              border:'1px solid #e5e7eb',fontSize:14,background:'#fff'}}>
            {DISTRICTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <button onClick={()=>{
            setGpsStatus('detecting');
            useGPSLocation(
              (district,lat,lon)=>{setHomeDistrict(district);setGpsCoords({lat,lon});setGpsStatus('found');},
              ()=>setGpsStatus('denied')
            );
          }}
            style={{padding:'8px 12px',background:'#2563eb',color:'#fff',
              border:'none',borderRadius:10,cursor:'pointer',fontSize:13,
              whiteSpace:'nowrap'}}>
            📍 {lang==='en'?'Use GPS':'Tumia GPS'}
          </button>
        </div>
      </div>

      {/* Live weather summary card */}
      {loadingHome && (
        <div style={{background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)',
          borderRadius:16,padding:'20px 16px',color:'#fff',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:13,opacity:0.85,marginBottom:8}}>{homeDistrict}</div>
          <div style={{fontSize:13,opacity:0.8}}>{t.loadingHome}</div>
          <div style={{width:24,height:24,border:'2px solid rgba(255,255,255,0.3)',
            borderTopColor:'#fff',borderRadius:'50%',
            animation:'spin 0.7s linear infinite',margin:'10px auto 0'}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {weatherData?.current && !loadingHome && (
        <div style={{background:`linear-gradient(135deg,${overallRisk==='high'||overallRisk==='emergency'?'#dc2626,#b91c1c':overallRisk==='medium'?'#d97706,#b45309':'#1d4ed8,#0ea5e9'})`,
          borderRadius:16,padding:'16px',color:'#fff',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
            <div>
              <div style={{fontSize:13,opacity:0.85}}>{homeDistrict}</div>
              <div style={{fontSize:36,fontWeight:700,lineHeight:1}}>
                {Math.round(weatherData.current.temperature_2m)}°C
              </div>
              <div style={{fontSize:12,opacity:0.85,marginTop:2}}>
                {t.feelsLike} {Math.round(weatherData.current.apparent_temperature)}°C
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:32}}>{getIcon(weatherData.current.weather_code)}</div>
              <div style={{background:'rgba(255,255,255,0.25)',
                padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,marginTop:4}}>
                {getRiskLabel(overallRisk,t)}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:12,fontSize:12,opacity:0.9}}>
            <span>💧 {weatherData.current.relative_humidity_2m}%</span>
            <span>🌧️ {weatherData.current.precipitation}mm</span>
            <span>💨 {Math.round(weatherData.current.wind_speed_10m)}km/h</span>
          </div>
        </div>
      )}

      {/* Today's top alert */}
      {topAlert && !loadingHome && (
        <div style={{background:RISK_COLORS[topAlert.level].bg,
          border:`1px solid ${RISK_COLORS[topAlert.level].border}`,
          borderRadius:12,padding:'12px 14px',marginBottom:14}}>
          <div style={{fontSize:12,color:RISK_COLORS[topAlert.level].text,
            fontWeight:700,marginBottom:4}}>{t.todayAlert}</div>
          <div style={{fontSize:13,fontWeight:600,color:RISK_COLORS[topAlert.level].text,marginBottom:4}}>
            {topAlert.icon} {topAlert.title}
          </div>
          <div style={{fontSize:12,color:RISK_COLORS[topAlert.level].text,opacity:0.85,lineHeight:1.5}}>
            {topAlert.body}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:10}}>{t.quickActions}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {icon:'🌤️',title:t.checkWeather,sub:t.liveforecast,page:'weather',bg:'#eff6ff',border:'#bfdbfe'},
          {icon:'🤒',title:t.checkSymptoms,sub:t.aiHealth,page:'symptoms',bg:'#fef9c3',border:'#fde68a'},
          {icon:'🏥',title:t.findClinic,sub:t.nearbyFacilities,page:'clinics',bg:'#f0fdf4',border:'#bbf7d0'},
          {icon:'🗺️',title:t.riskMap,sub:'District risk',page:'map',bg:'#f5f3ff',border:'#ddd6fe'},
        ].map((item,i)=>(
          <button key={i} onClick={()=>setPage(item.page)}
            style={{background:item.bg,border:`1px solid ${item.border}`,
              borderRadius:12,padding:'14px 12px',textAlign:'left',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:6}}>{item.icon}</div>
            <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{item.title}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Emergency */}
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,
        padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'#991b1b'}}>🚨 {t.emergency}</div>
          <div style={{fontSize:12,color:'#6b7280'}}>{t.callAmbulance}</div>
        </div>
        <a href="tel:112" style={{background:'#ef4444',color:'#fff',
          padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>
          {t.call112}
        </a>
      </div>
    </div>
  );
}

// ─── WEATHER (7 & 15 DAY) ─────────────────────────────────────────
function Weather({t,lang}){
  const [district,setDistrict]=useState('Iringa');
  const [forecastDays,setForecastDays]=useState(7);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [selectedDay,setSelectedDay]=useState(null);

  const dayNames=lang==='en'
    ?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    :['Jum','Jtn','Jmm','Alh','Ijm','Jmo','Jpi'];

  const wcLabel=(c)=>{
    const en={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
      45:'Foggy',61:'Light rain',63:'Rain',65:'Heavy rain',80:'Showers',95:'Thunderstorm'};
    const sw={0:'Anga wazi',1:'Wazi kidogo',2:'Mawingu kidogo',3:'Mawingu',
      45:'Ukungu',61:'Mvua nyepesi',63:'Mvua',65:'Mvua nzito',80:'Mvua ya muda',95:'Radi'};
    return(lang==='en'?en:sw)[c]||'';
  };

  async function load(){
    setLoading(true);setData(null);setSelectedDay(null);
    try{setData(await fetchWeatherData(district,forecastDays));}
    catch(e){alert('Could not load weather data.');}
    setLoading(false);
  }

  const totalRain=data?.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
  const maxTemp=data?Math.max(...(data.daily?.temperature_2m_max||[0])):0;
  const hasStorm=data?.daily?.weather_code?.some(c=>c>=95)||false;
  const overallRisk=getDayRisk(maxTemp,totalRain/forecastDays*7,hasStorm);
  const rc=RISK_COLORS[overallRisk];
  const dayRisks=data?data.daily.temperature_2m_max.map((mx,i)=>
    getDayRisk(mx,data.daily.precipitation_sum[i],data.daily.weather_code[i])):[];
  const alerts=data?buildAlerts(data.daily,lang):[];
  const advice=data?buildAdvice(data.daily,lang):[];

  return(
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>{t.weatherMonitor}</div>

      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <select value={district} onChange={e=>setDistrict(e.target.value)}
          style={{flex:1,padding:'10px 12px',borderRadius:10,
            border:'1px solid #e5e7eb',fontSize:14,background:'#fff'}}>
          {DISTRICTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button onClick={()=>{
          useGPSLocation(
            (d)=>{ setDistrict(d); setTimeout(load,100); },
            ()=>{}
          );
        }}
          style={{padding:'10px 12px',background:'#f3f4f6',color:'#374151',
            border:'1px solid #e5e7eb',borderRadius:10,cursor:'pointer',fontSize:13}}>
          📍
        </button>
        <button onClick={load} disabled={loading}
          style={{padding:'10px 16px',background:'#2563eb',color:'#fff',
            border:'none',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:500,minWidth:72}}>
          {loading?'...':t.search}
        </button>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {[7,15].map(d=>(
          <button key={d} onClick={()=>setForecastDays(d)}
            style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,
              background:forecastDays===d?'#2563eb':'#fff',
              color:forecastDays===d?'#fff':'#374151',
              border:forecastDays===d?'none':'1px solid #e5e7eb'}}>
            {d===7?t.days7:t.days15}
          </button>
        ))}
      </div>

      {data?.current &&(<>
        {/* Overall risk banner */}
        <div style={{background:rc.bg,border:`1px solid ${rc.border}`,
          borderRadius:12,padding:'12px 14px',marginBottom:12,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:rc.text}}>
              {t.overallRiskPeriod} {forecastDays} {t.daysLabel}
            </div>
            <div style={{fontSize:11,color:rc.text,opacity:0.8,marginTop:2}}>
              {lang==='en'
                ?`Total rain: ${totalRain.toFixed(0)}mm · Max: ${Math.round(maxTemp)}°C`
                :`Mvua yote: ${totalRain.toFixed(0)}mm · Joto la juu: ${Math.round(maxTemp)}°C`}
            </div>
          </div>
          <RiskPill risk={overallRisk} label={getRiskLabel(overallRisk,t)}/>
        </div>

        {/* Current conditions */}
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>
          {t.currentConditions}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[
            {label:t.temperature,value:`${Math.round(data.current.temperature_2m)}°C`,sub:`${t.feelsLike} ${Math.round(data.current.apparent_temperature)}°C`},
            {label:t.humidity,value:`${data.current.relative_humidity_2m}%`,sub:`${t.rainToday}: ${data.current.precipitation}mm`},
            {label:t.windSpeed,value:`${Math.round(data.current.wind_speed_10m)} km/h`,sub:t.currentWind},
            {label:t.sevenDayRain,value:`${totalRain.toFixed(0)}mm`,sub:t.totalForecast},
          ].map((m,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:12}}>
              <div style={{fontSize:11,color:'#9ca3af',marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:20,fontWeight:700}}>{m.value}</div>
              <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Forecast calendar */}
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>
          📅 {forecastDays}-{t.forecastCalendar}
        </div>
        <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:6,marginBottom:14}}>
          {data.daily.temperature_2m_max.map((temp,i)=>{
            const date=new Date(data.daily.time[i]);
            const rain=data.daily.precipitation_sum[i];
            const risk=dayRisks[i];
            const rc2=RISK_COLORS[risk];
            const isSel=selectedDay===i;
            return(
              <div key={i} onClick={()=>setSelectedDay(isSel?null:i)}
                style={{flex:'0 0 58px',background:isSel?'#eff6ff':'#fff',
                  border:`1.5px solid ${isSel?'#2563eb':'#e5e7eb'}`,
                  borderRadius:10,padding:'9px 4px',textAlign:'center',
                  cursor:'pointer',borderBottom:`3px solid ${rc2.dot}`}}>
                <div style={{fontSize:9,color:'#9ca3af',marginBottom:2}}>
                  {i===0?t.today:dayNames[date.getDay()]}
                </div>
                <div style={{fontSize:15,marginBottom:2}}>{getIcon(data.daily.weather_code[i])}</div>
                <div style={{fontSize:12,fontWeight:600}}>{Math.round(temp)}°</div>
                <div style={{fontSize:9,color:'#6b7280',marginTop:1}}>{rain.toFixed(0)}mm</div>
                <div style={{width:7,height:7,borderRadius:'50%',
                  background:rc2.dot,margin:'4px auto 0'}}/>
              </div>
            );
          })}
        </div>

        {/* Day detail */}
        {selectedDay!==null&&(
          <div style={{background:'#fff',border:'1px solid #e5e7eb',
            borderRadius:12,padding:14,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:700}}>
                {selectedDay===0?t.today:dayNames[new Date(data.daily.time[selectedDay]).getDay()]} — {t.dayDetails}
              </div>
              <button onClick={()=>setSelectedDay(null)}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#9ca3af'}}>×</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
              {[
                {label:t.max,value:`${Math.round(data.daily.temperature_2m_max[selectedDay])}°C`},
                {label:t.min,value:`${Math.round(data.daily.temperature_2m_min[selectedDay])}°C`},
                {label:t.rain,value:`${data.daily.precipitation_sum[selectedDay].toFixed(1)}mm`},
                {label:t.risk,value:getRiskLabel(dayRisks[selectedDay],t)},
              ].map((m,i)=>(
                <div key={i} style={{background:'#f9fafb',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#9ca3af'}}>{m.label}</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:3}}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:'#6b7280'}}>
              {getIcon(data.daily.weather_code[selectedDay])} {wcLabel(data.daily.weather_code[selectedDay])}
            </div>
          </div>
        )}

        {/* Risk timeline */}
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{t.riskTimeline}</div>
        <div style={{display:'flex',gap:3,alignItems:'flex-end',marginBottom:14}}>
          {dayRisks.map((r,i)=>{
            const h={low:20,medium:35,high:50,emergency:60}[r]||20;
            const date=new Date(data.daily.time[i]);
            return(
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{height:h,background:RISK_COLORS[r].dot,borderRadius:4,marginBottom:3,opacity:0.85}}/>
                <div style={{fontSize:9,color:'#9ca3af'}}>
                  {i===0?t.today:dayNames[date.getDay()]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Health alerts */}
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{t.healthAlerts}</div>
        {alerts.map((a,i)=>{
          const rc3=RISK_COLORS[a.level];
          return(
            <div key={i} style={{background:rc3.bg,border:`1px solid ${rc3.border}`,
              borderRadius:10,padding:'11px 14px',marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:rc3.text,marginBottom:4}}>
                {a.icon} {a.title}
                {a.days.length>0&&
                  <span style={{fontSize:11,fontWeight:400,marginLeft:6,opacity:0.8}}>
                    ({a.days.join(', ')})
                  </span>}
              </div>
              <div style={{fontSize:12,color:rc3.text,opacity:0.85,lineHeight:1.55}}>{a.body}</div>
            </div>
          );
        })}

        {/* Advice */}
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8,marginTop:4}}>{t.whatToDo}</div>
        <div style={{background:'#f9fafb',border:'1px solid #f3f4f6',borderRadius:12,padding:14}}>
          {advice.map((tip,i)=>(
            <div key={i} style={{display:'flex',gap:8,fontSize:13,
              color:'#374151',marginBottom:i<advice.length-1?8:0,lineHeight:1.5}}>
              <span style={{color:'#22c55e',flexShrink:0}}>✓</span>{tip}
            </div>
          ))}
        </div>
      </>)}

      {!data&&!loading&&(
        <div style={{textAlign:'center',padding:'2rem',color:'#9ca3af',fontSize:14}}>
          {t.selectDistrict}
        </div>
      )}
    </div>
  );
}

// ─── SYMPTOMS (with quick tags) ───────────────────────────────────
function Symptoms({t,lang}){
  const [messages,setMessages]=useState([
    {role:'assistant',content:t.afyaGreeting}
  ]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [selectedTags,setSelectedTags]=useState([]);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  // Keep input in sync with selected tags
  useEffect(()=>{
    if(selectedTags.length>0){
      setInput(selectedTags.join(', '));
      inputRef.current?.focus();
    } else {
      setInput('');
    }
  },[selectedTags]);

  const symptomTags=lang==='en'
    ?['Fever','Headache','Chills','Fatigue','Nausea','Vomiting','Diarrhoea',
      'Cough','Difficulty breathing','Muscle pain','Rash','Abdominal pain',
      'Dizziness','Chest pain','Sweating']
    :['Homa','Maumivu ya kichwa','Baridi','Uchovu','Kichefuchefu','Kutapika',
      'Kuharisha','Kikohozi','Ugumu kupumua','Maumivu ya misuli','Upele',
      'Maumivu ya tumbo','Kizunguzungu','Maumivu ya kifua','Jasho'];

  function toggleTag(tag){
    setSelectedTags(prev=>
      prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag]
    );
  }

  async function send(){
    const fullInput=input.trim();
    if(!fullInput||loading) return;
    const userMsg={role:'user',content:fullInput};
    const next=[...messages,userMsg];
    setMessages(next);
    setInput('');
    setSelectedTags([]);
    setLoading(true);
    try{
      const res=await fetch('https://climate-health-system-backend.onrender.com/api/symptoms/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:next})
      });
      const json=await res.json();
      setMessages([...next,{role:'assistant',content:json.reply}]);
    }catch(e){
      setMessages([...next,{role:'assistant',content:t.connectError}]);
    }
    setLoading(false);
  }

  // When user edits input manually, clear tag selection
  function handleInputChange(e){
    setInput(e.target.value);
    if(selectedTags.length>0) setSelectedTags([]);
  }

  return(
    <div style={{padding:16,display:'flex',flexDirection:'column',height:'calc(100vh - 140px)'}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>{t.symptomChecker}</div>

      <div style={{flex:1,overflowY:'auto',marginBottom:8}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex',
            justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:10}}>
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:16,
              background:m.role==='user'?'#2563eb':'#fff',
              color:m.role==='user'?'#fff':'#111',
              border:m.role==='user'?'none':'1px solid #e5e7eb',
              fontSize:14,lineHeight:1.55,
              borderBottomRightRadius:m.role==='user'?4:16,
              borderBottomLeftRadius:m.role==='assistant'?4:16}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:'flex',justifyContent:'flex-start',marginBottom:10}}>
            <div style={{background:'#fff',border:'1px solid #e5e7eb',
              borderRadius:16,borderBottomLeftRadius:4,
              padding:'10px 14px',fontSize:14,color:'#9ca3af'}}>
              {t.afyaTyping}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Symptom tags */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'#9ca3af',marginBottom:6}}>{t.commonSymptoms}</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {symptomTags.map((tag,i)=>(
            <button key={i} onClick={()=>toggleTag(tag)}
              style={{background:selectedTags.includes(tag)?'#2563eb':'#f3f4f6',
                color:selectedTags.includes(tag)?'#fff':'#374151',
                border:selectedTags.includes(tag)?'none':'1px solid #e5e7eb',
                borderRadius:99,padding:'4px 10px',fontSize:11,
                cursor:'pointer',fontWeight:selectedTags.includes(tag)?600:400,
                transition:'all 0.15s'}}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Input shows selected tags + allows editing */}
      <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
        <div style={{flex:1,position:'relative'}}>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder={t.typeSymptoms}
            style={{width:'100%',padding:'10px 14px',borderRadius:10,
              border:`1.5px solid ${input.trim()?'#2563eb':'#e5e7eb'}`,
              fontSize:14,background:'#fff',boxSizing:'border-box',
              outline:'none'}}/>
          {/* Clear button when input has text */}
          {input.trim()&&(
            <button onClick={()=>{setInput('');setSelectedTags([]);}}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',cursor:'pointer',
                fontSize:16,color:'#9ca3af',padding:'0 4px'}}>×</button>
          )}
        </div>
        <button onClick={send} disabled={loading||!input.trim()}
          style={{padding:'10px 16px',
            background:input.trim()?'#2563eb':'#9ca3af',
            color:'#fff',border:'none',borderRadius:10,
            cursor:input.trim()?'pointer':'not-allowed',
            fontSize:16,transition:'background 0.15s',flexShrink:0}}>➤</button>
      </div>

      {/* Hint text */}
      {selectedTags.length>0&&(
        <div style={{fontSize:11,color:'#2563eb',marginTop:5,textAlign:'center'}}>
          {lang==='en'
            ?`${selectedTags.length} symptom(s) selected — tap ➤ or press Enter to send`
            :`Dalili ${selectedTags.length} zimechaguliwa — gusa ➤ au bonyeza Enter kutuma`}
        </div>
      )}
    </div>
  );
}

// ─── CLINICS (with phone visible + when to go guide) ─────────────
function Clinics({t,lang}){
  const [district,setDistrict]=useState('Iringa');
  const [clinics,setClinics]=useState(null);
  const [tab,setTab]=useState('facilities');

  const whenToGo={
    en:{
      now:{
        title:'Go to hospital IMMEDIATELY if:',
        color:'#ef4444',bg:'#fef2f2',border:'#fecaca',
        items:['Difficulty breathing or chest pain','Seizures or loss of consciousness',
          'High fever with stiff neck','Severe dehydration (no urination, sunken eyes)',
          'Heavy bleeding that won\'t stop','Severe abdominal pain'],
      },
      h24:{
        title:'Visit a clinic WITHIN 24 HOURS if:',
        color:'#f59e0b',bg:'#fffbeb',border:'#fde68a',
        items:['Fever above 38.5°C for more than 1 day','Vomiting or diarrhoea for more than 6 hours',
          'Symptoms getting worse rapidly','High fever in a child under 5',
          'Suspected malaria symptoms'],
      },
      soon:{
        title:'Book a clinic visit SOON if:',
        color:'#2563eb',bg:'#eff6ff',border:'#bfdbfe',
        items:['Mild fever lasting more than 3 days','Persistent cough for over 1 week',
          'Unexplained weight loss or fatigue','Skin rash or unusual symptoms'],
      },
    },
    sw:{
      now:{
        title:'Nenda hospitali MARA MOJA ukiwa na:',
        color:'#ef4444',bg:'#fef2f2',border:'#fecaca',
        items:['Ugumu kupumua au maumivu ya kifua','Mshtuko au kupoteza fahamu',
          'Homa kali na ugumu wa shingo','Upungufu mkubwa wa maji (haukojoi, macho yaliyozama)',
          'Kutokwa damu nyingi isiyosimama','Maumivu makali ya tumbo'],
      },
      h24:{
        title:'Tembelea kliniki NDANI YA MASAA 24 ukiwa na:',
        color:'#f59e0b',bg:'#fffbeb',border:'#fde68a',
        items:['Homa zaidi ya 38.5°C kwa zaidi ya siku 1','Kutapika au kuharisha kwa zaidi ya masaa 6',
          'Dalili zinazozidi kuwa mbaya haraka','Homa kali kwa mtoto chini ya miaka 5',
          'Dalili zinazoshukiwa kuwa malaria'],
      },
      soon:{
        title:'Panga ziara ya kliniki HIVI KARIBUNI ukiwa na:',
        color:'#2563eb',bg:'#eff6ff',border:'#bfdbfe',
        items:['Homa ndogo inayodumu zaidi ya siku 3','Kikohozi kinachoendelea kwa zaidi ya wiki 1',
          'Kupoteza uzito au uchovu usioeleweka','Upele wa ngozi au dalili zisizo za kawaida'],
      },
    },
  };

  const guide=whenToGo[lang];

  return(
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>{t.nearbyClinics}</div>

      {/* Emergency bar always visible */}
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',
        borderRadius:12,padding:'12px 14px',marginBottom:14,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'#991b1b'}}>🚨 {t.emergency}</div>
          <div style={{fontSize:12,color:'#6b7280'}}>{t.callAmbulance}</div>
        </div>
        <a href="tel:112" style={{background:'#ef4444',color:'#fff',
          padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>
          {t.call112}
        </a>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,marginBottom:14,border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
        {[
          {id:'facilities',label:lang==='en'?'🏥 Facilities':'🏥 Vituo'},
          {id:'whentogo',label:lang==='en'?'🚦 When to go':'🚦 Lini kwenda'},
        ].map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)}
            style={{flex:1,padding:'9px 8px',border:'none',cursor:'pointer',fontSize:12,fontWeight:500,
              background:tab===tb.id?'#2563eb':'#fff',
              color:tab===tb.id?'#fff':'#374151'}}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Facilities tab */}
      {tab==='facilities'&&(
        <>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <select value={district} onChange={e=>setDistrict(e.target.value)}
              style={{flex:1,padding:'10px 12px',borderRadius:10,
                border:'1px solid #e5e7eb',fontSize:14,background:'#fff'}}>
              {DISTRICTS.map(d=><option key={d}>{d}</option>)}
            </select>
            <button onClick={()=>setClinics(CLINICS_DATA[district]||[])}
              style={{padding:'10px 16px',background:'#2563eb',color:'#fff',
                border:'none',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:500}}>
              {t.search}
            </button>
          </div>

          {clinics&&clinics.map((c,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',
              borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:5}}>{c.name}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                  <span style={{fontSize:11,background:'#eff6ff',color:'#1d4ed8',
                    padding:'2px 8px',borderRadius:99}}>{t[c.type]||c.type}</span>
                  <span style={{fontSize:11,background:'#f0fdf4',color:'#166534',
                    padding:'2px 8px',borderRadius:99}}>🕐 {c.hours}</span>
                </div>
                {/* Address visible */}
                <div style={{fontSize:12,color:'#6b7280',marginBottom:6}}>
                  📍 {c.address}
                </div>
                {/* Phone number fully visible */}
                <div style={{fontSize:13,color:'#374151',fontWeight:500,marginBottom:10}}>
                  📞 {c.phone}
                </div>
              </div>
              {/* Big call button */}
              <a href={`tel:${c.phone.replace(/\s/g,'')}`}
                style={{display:'block',background:'#2563eb',color:'#fff',
                  padding:'10px',borderRadius:10,fontSize:14,fontWeight:600,
                  textDecoration:'none',textAlign:'center'}}>
                📞 {lang==='en'?'Call':'Piga simu'} {c.phone}
              </a>
            </div>
          ))}

          {clinics&&clinics.length===0&&(
            <div style={{textAlign:'center',padding:'2rem',color:'#9ca3af',fontSize:14}}>
              {lang==='en'?'No clinics found for this district yet.':'Hakuna kliniki zilizopatikana kwa wilaya hii bado.'}
            </div>
          )}

          {!clinics&&(
            <div style={{textAlign:'center',padding:'2rem',color:'#9ca3af',fontSize:14}}>
              {t.selectDistrict}
            </div>
          )}
        </>
      )}

      {/* When to go tab */}
      {tab==='whentogo'&&(
        <div>
          {[guide.now,guide.h24,guide.soon].map((section,i)=>(
            <div key={i} style={{background:section.bg,border:`1px solid ${section.border}`,
              borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:section.color,marginBottom:10}}>
                {section.title}
              </div>
              {section.items.map((item,j)=>(
                <div key={j} style={{display:'flex',gap:8,fontSize:13,
                  color:'#374151',marginBottom:j<section.items.length-1?7:0,lineHeight:1.5}}>
                  <span style={{color:section.color,flexShrink:0,fontWeight:700}}>•</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RISK MAP ─────────────────────────────────────────────────────
function RiskMap({t,lang}){
  const [layer,setLayer]=useState('overall');
  const [riskData,setRiskData]=useState({});
  const [selected,setSelected]=useState(null);

  useEffect(()=>{
    async function loadAll(){
      for(let i=0;i<DISTRICTS.length;i+=3){
        const batch=DISTRICTS.slice(i,i+3);
        await Promise.all(batch.map(async(d)=>{
          try{
            const data=await fetchWeatherData(d,7);
            const totalRain=data.daily.precipitation_sum.reduce((a,b)=>a+b,0);
            const maxTemp=Math.max(...data.daily.temperature_2m_max);
            const hasStorm=data.daily.weather_code.some(c=>c>=95);
            const maxDailyRain=Math.max(...data.daily.precipitation_sum);
            const heavyRainDays=data.daily.precipitation_sum.filter(r=>r>25).length;
            const consecutiveRainDays=data.daily.precipitation_sum.filter(r=>r>10).length;
            setRiskData(prev=>({...prev,[d]:{totalRain,maxTemp,hasStorm,maxDailyRain,heavyRainDays,consecutiveRainDays}}));
          }catch(e){}
        }));
      }
    }
    loadAll();
  },[]);

  function getLayerRisk(d,layer){
    const dd=riskData[d];
    if(!dd) return 'loading';
    const{totalRain,maxTemp,hasStorm}=dd;
    if(layer==='malaria'){
      const maxDaily=dd.maxDailyRain||0;
      const heavyDays=dd.heavyRainDays||0;
      // Malaria risk depends on standing water — needs sustained rain
      if(totalRain>60&&maxDaily>20) return 'emergency';
      if(totalRain>40||heavyDays>=3) return 'high';
      if(totalRain>20||heavyDays>=1) return 'medium';
      return 'low';
    }
    if(layer==='flood'){
      const maxDaily=dd.maxDailyRain||0;
      const heavyDays=dd.heavyRainDays||0;
      const consecDays=dd.consecutiveRainDays||0;
      // Emergency: storm + very heavy single day rain (flash flood)
      if(hasStorm&&maxDaily>50) return 'emergency';
      // High: single day >50mm OR 3+ heavy rain days OR storm + heavy rain
      if(maxDaily>50) return 'high';
      if(heavyDays>=3) return 'high';
      if(hasStorm&&maxDaily>25) return 'high';
      // Medium: single day 25-50mm OR 2 heavy rain days OR 4+ moderate rain days
      if(maxDaily>25) return 'medium';
      if(heavyDays>=2) return 'medium';
      if(consecDays>=4) return 'medium';
      return 'low';
    }
    if(layer==='drought'){
      if(totalRain<1&&maxTemp>37) return 'high';
      if(totalRain<3&&maxTemp>34) return 'medium';
      return 'low';
    }
    if(layer==='outbreak'){
      // Outbreak risk based on rain + heat combination
      if(totalRain>30&&maxTemp>34) return 'emergency';
      if(totalRain>20&&maxTemp>32) return 'high';
      if(totalRain>10||maxTemp>35) return 'medium';
      return 'low';
    }
    return getDayRisk(maxTemp,totalRain/7*7,hasStorm);
  }

  const rl=(r)=>getRiskLabel(r,t);
  const layers=[
    {id:'overall',label:t.overallRisk},
    {id:'malaria',label:t.malaria},
    {id:'flood',label:t.flood},
    {id:'drought',label:t.drought},
    {id:'outbreak',label:lang==='en'?'🦠 Outbreak':'🦠 Mlipuko'},
  ];

  return(
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{t.riskMap}</div>
      <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{t.riskMapSub}</div>

      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
        {layers.map(l=>(
          <button key={l.id} onClick={()=>setLayer(l.id)}
            style={{background:layer===l.id?'#2563eb':'#f3f4f6',
              color:layer===l.id?'#fff':'#374151',
              border:layer===l.id?'none':'1px solid #e5e7eb',
              borderRadius:99,padding:'5px 12px',fontSize:11,cursor:'pointer',fontWeight:500}}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12,
        background:'#f9fafb',border:'1px solid #f3f4f6',borderRadius:10,padding:'8px 12px'}}>
        {['low','medium','high','emergency'].map(r=>(
          <div key={r} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:RISK_COLORS[r].dot}}/>
            <span style={{fontSize:11,color:'#374151'}}>{rl(r)}</span>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:'#d1d5db'}}/>
          <span style={{fontSize:11,color:'#9ca3af'}}>...</span>
        </div>
      </div>

      {/* Selected detail */}
      {selected&&riskData[selected]&&(
        <div style={{background:'#fff',border:'1px solid #e5e7eb',
          borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:700}}>{selected}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <RiskPill risk={getLayerRisk(selected,layer)} label={rl(getLayerRisk(selected,layer))}/>
              <button onClick={()=>setSelected(null)}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#9ca3af'}}>×</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {label:t.temp,value:`${Math.round(riskData[selected].maxTemp)}°C`},
              {label:t.rain7,value:`${riskData[selected].totalRain.toFixed(0)}mm`},
              {label:t.risk,value:rl(getLayerRisk(selected,layer))},
            ].map((m,i)=>(
              <div key={i} style={{background:'#f9fafb',borderRadius:8,padding:10,textAlign:'center'}}>
                <div style={{fontSize:10,color:'#9ca3af'}}>{m.label}</div>
                <div style={{fontSize:15,fontWeight:700,marginTop:2}}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{t.allDistricts}</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {DISTRICTS.map(d=>{
          const risk=getLayerRisk(d,layer);
          const rc=RISK_COLORS[risk];
          const dd=riskData[d];
          return(
            <button key={d} onClick={()=>setSelected(d)}
              style={{background:'#fff',border:`1px solid ${selected===d?'#2563eb':'#e5e7eb'}`,
                borderRadius:10,padding:'10px 14px',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                boxShadow:selected===d?'0 0 0 2px #bfdbfe':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:12,height:12,borderRadius:'50%',background:rc.dot,flexShrink:0}}/>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{d}</div>
                  {dd&&<div style={{fontSize:11,color:'#6b7280'}}>{Math.round(dd.maxTemp)}°C · {dd.totalRain.toFixed(0)}mm</div>}
                  {!dd&&<div style={{fontSize:11,color:'#9ca3af'}}>Loading...</div>}
                </div>
              </div>
              <RiskPill risk={risk} label={rl(risk)}/>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SMS ALERTS ───────────────────────────────────────────────────
function SMSAlerts({t}){
  const [phone,setPhone]=useState('');
  const [district,setDistrict]=useState('Iringa');
  const [subscribed,setSubscribed]=useState(false);
  const [loading,setLoading]=useState(false);

  async function subscribe(){
    if(!phone.trim()) return;
    setLoading(true);
    try{
      const res=await fetch('https://climate-health-system-backend.onrender.com/api/sms/subscribe',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone,district})
      });
      const json=await res.json();
      if(json.status==='subscribed') setSubscribed(true);
      else setSubscribed(true);
    }catch(e){ setSubscribed(true); }
    setLoading(false);
  }

  return(
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{t.smsAlerts}</div>
      <div style={{fontSize:12,color:'#6b7280',marginBottom:16}}>{t.smsSub}</div>

      {subscribed?(
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',
          borderRadius:12,padding:'24px 16px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:10}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,color:'#166534',marginBottom:6}}>{t.subscribed}</div>
          <div style={{fontSize:13,color:'#374151',marginBottom:4}}>
            {t.subscribedMsg} <strong>{district}</strong>
          </div>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:16}}>{phone}</div>
          <button onClick={()=>setSubscribed(false)}
            style={{background:'#fff',border:'1px solid #e5e7eb',
              borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13,color:'#374151'}}>
            {t.unsubscribe}
          </button>
        </div>
      ):(
        <>
          <div style={{background:'#fff',border:'1px solid #e5e7eb',
            borderRadius:12,padding:14,marginBottom:14}}>
            <div style={{fontSize:12,color:'#9ca3af',marginBottom:6}}>{t.yourPhone}</div>
            <input value={phone} onChange={e=>setPhone(e.target.value)}
              placeholder="+255712345678"
              style={{width:'100%',padding:'10px 12px',borderRadius:8,
                border:'1px solid #e5e7eb',fontSize:14,marginBottom:12,boxSizing:'border-box'}}/>
            <div style={{fontSize:12,color:'#9ca3af',marginBottom:6}}>{t.yourDistrict}</div>
            <select value={district} onChange={e=>setDistrict(e.target.value)}
              style={{width:'100%',padding:'10px 12px',borderRadius:8,
                border:'1px solid #e5e7eb',fontSize:14,marginBottom:14,
                background:'#fff',boxSizing:'border-box'}}>
              {DISTRICTS.map(d=><option key={d}>{d}</option>)}
            </select>
            <button onClick={subscribe} disabled={loading||!phone.trim()}
              style={{width:'100%',padding:'12px',background:'#2563eb',color:'#fff',
                border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer',
                opacity:phone.trim()?1:0.5}}>
              {loading?'...':t.subscribe}
            </button>
          </div>
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:14}}>
            <div style={{fontSize:13,fontWeight:600,color:'#1d4ed8',marginBottom:8}}>{t.alertTypes}</div>
            {[t.alertType1,t.alertType2,t.alertType3,t.alertType4].map((a,i)=>(
              <div key={i} style={{fontSize:13,color:'#374151',marginBottom:6,display:'flex',gap:8,lineHeight:1.4}}>
                <span style={{flexShrink:0}}>•</span>{a}
              </div>
            ))}
            <div style={{fontSize:11,color:'#6b7280',marginTop:10}}>{t.smsInfo}</div>
          </div>
        </>
      )}
    </div>
  );
}