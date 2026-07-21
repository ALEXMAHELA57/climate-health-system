from fastapi import APIRouter
import httpx
import time

router = APIRouter()

# Rough district center coordinates, used to query OpenStreetMap for nearby
# health facilities (hospitals, clinics, dispensaries, doctors' offices).
DISTRICT_COORDS = {
    'Iringa':        {'lat': -7.77,  'lon': 35.69},
    'Dar es Salaam': {'lat': -6.79,  'lon': 39.21},
    'Dodoma':        {'lat': -6.17,  'lon': 35.74},
    'Mwanza':        {'lat': -2.52,  'lon': 32.92},
    'Arusha':        {'lat': -3.39,  'lon': 36.68},
    'Mbeya':         {'lat': -8.91,  'lon': 33.46},
    'Morogoro':      {'lat': -6.82,  'lon': 37.66},
    'Tanga':         {'lat': -5.07,  'lon': 39.10},
    'Zanzibar West': {'lat': -6.17,  'lon': 39.20},
    'Kilimanjaro':   {'lat': -3.35,  'lon': 37.33},
    'Tabora':        {'lat': -5.02,  'lon': 32.80},
    'Kigoma':        {'lat': -4.88,  'lon': 29.63},
    'Lindi':         {'lat': -9.99,  'lon': 39.71},
    'Mtwara':        {'lat':-10.27,  'lon': 40.18},
    'Ruvuma':        {'lat':-10.68,  'lon': 35.65},
    'Shinyanga':     {'lat': -3.66,  'lon': 33.42},
    'Singida':       {'lat': -4.82,  'lon': 34.75},
    'Rukwa':         {'lat': -7.98,  'lon': 32.03},
    'Kagera':        {'lat': -1.33,  'lon': 31.82},
    'Mara':          {'lat': -1.77,  'lon': 34.00},
    'Geita':         {'lat': -2.87,  'lon': 32.23},
    'Simiyu':        {'lat': -2.63,  'lon': 34.22},
    'Njombe':        {'lat': -9.33,  'lon': 34.77},
    'Pwani':         {'lat': -7.07,  'lon': 38.67},
    'Manyara':       {'lat': -3.70,  'lon': 35.88},
    'Katavi':        {'lat': -6.33,  'lon': 31.08},
    'Songea':        {'lat':-10.68,  'lon': 35.65},
    'Pemba North':   {'lat': -5.03,  'lon': 39.77},
    'Pemba South':   {'lat': -5.32,  'lon': 39.72},
    'Zanzibar North':{'lat': -5.72,  'lon': 39.25},
    'Zanzibar South':{'lat': -6.38,  'lon': 39.52},
}

# In-memory cache so we don't hammer the public Overpass API on every request.
# Render's free tier restarts periodically anyway, which naturally clears this.
_osm_cache = {}
_OSM_CACHE_TTL = 6 * 60 * 60  # 6 hours
_OSM_RADIUS_M = 25000  # 25km around the district center

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

async def fetch_osm_facilities(lat: float, lon: float):
    query = f"""
    [out:json][timeout:20];
    (
      node["amenity"~"hospital|clinic|doctors"](around:{_OSM_RADIUS_M},{lat},{lon});
      way["amenity"~"hospital|clinic|doctors"](around:{_OSM_RADIUS_M},{lat},{lon});
      node["healthcare"](around:{_OSM_RADIUS_M},{lat},{lon});
    );
    out center tags;
    """
    headers = {
        "User-Agent": "AfyaHewa-ClimateHealthSystem/1.0 (Tanzania health app; contact via GitHub ALEXMAHELA57)",
        "Accept": "application/json",
    }

    data = None
    for mirror in OVERPASS_MIRRORS:
        try:
            async with httpx.AsyncClient(timeout=25) as client:
                res = await client.post(mirror, data={"data": query}, headers=headers)
            print(f"[clinics] OSM {mirror} status={res.status_code} for ({lat},{lon})")
            if res.status_code == 200:
                data = res.json()
                break
            print(f"[clinics] OSM error body: {res.text[:200]}")
        except Exception as e:
            print(f"[clinics] OSM {mirror} threw: {type(e).__name__}: {e}")
    if data is None:
        print("[clinics] all OSM mirrors failed, falling back to curated list only")
        return []

    elements = data.get("elements", [])
    print(f"[clinics] OSM returned {len(elements)} raw elements")
    facilities = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue  # skip unnamed nodes, not useful to show a user
        lat_v = el.get("lat") or el.get("center", {}).get("lat")
        lon_v = el.get("lon") or el.get("center", {}).get("lon")
        if lat_v is None or lon_v is None:
            continue
        amenity = tags.get("amenity") or tags.get("healthcare") or "clinic"
        facility_type = {
            "hospital": "hospital", "clinic": "clinic",
            "doctors": "clinic", "dispensary": "dispensary",
            "centre": "clinic", "pharmacy": "pharmacy",
        }.get(amenity, "clinic")
        address = tags.get("addr:full") or tags.get("addr:street") or tags.get("addr:city") or ""
        facilities.append({
            "name": name,
            "type": facility_type,
            "phone": tags.get("contact:phone") or tags.get("phone") or "",
            "hours": tags.get("opening_hours") or "",
            "address": address,
            "lat": lat_v,
            "lon": lon_v,
            "source": "osm",
        })
    print(f"[clinics] parsed {len(facilities)} named facilities from OSM")
    return facilities

def merge_clinics(curated: list, osm: list):
    """Curated hospitals (with verified phone numbers) come first;
    OSM facilities are added after, skipping obvious name duplicates."""
    curated_names = {c["name"].strip().lower() for c in curated}
    merged = list(curated)
    for f in osm:
        key = f["name"].strip().lower()
        if key in curated_names:
            continue
        curated_names.add(key)
        merged.append(f)
    return merged

CLINICS = {
  'Iringa': [
    {'name':'Iringa Regional Referral Hospital','type':'hospital','phone':'+255262702285','hours':'24/7','address':'Iringa Town','lat':-7.7701,'lon':35.6937},
    {'name':'Tosamaganga Hospital','type':'hospital','phone':'+255262702100','hours':'24/7','address':'Tosamaganga','lat':-7.8023,'lon':35.6521},
    {'name':'Iringa Urban Health Centre','type':'clinic','phone':'+255262702300','hours':'7am-9pm','address':'Iringa Town','lat':-7.7680,'lon':35.6920},
    {'name':'Kilolo District Hospital','type':'hospital','phone':'+255262920100','hours':'24/7','address':'Kilolo','lat':-7.9167,'lon':36.9833},
  ],
  'Dar es Salaam': [
    {'name':'Muhimbili National Hospital','type':'hospital','phone':'+255222150610','hours':'24/7','address':'Upanga','lat':-6.8005,'lon':39.2730},
    {'name':'Amana Regional Hospital','type':'hospital','phone':'+255222861810','hours':'24/7','address':'Ilala','lat':-6.8235,'lon':39.2695},
    {'name':'Mwananyamala Regional Hospital','type':'hospital','phone':'+255222700056','hours':'24/7','address':'Kinondoni','lat':-6.7726,'lon':39.2368},
    {'name':'Temeke District Hospital','type':'hospital','phone':'+255222852017','hours':'24/7','address':'Temeke','lat':-6.8710,'lon':39.2627},
  ],
  'Dodoma': [
    {'name':'Benjamin Mkapa Hospital','type':'hospital','phone':'+255262321666','hours':'24/7','address':'Dodoma','lat':-6.1731,'lon':35.7394},
    {'name':'Dodoma Regional Hospital','type':'hospital','phone':'+255262321234','hours':'24/7','address':'Dodoma','lat':-6.1800,'lon':35.7450},
  ],
  'Mwanza': [
    {'name':'Bugando Medical Centre','type':'hospital','phone':'+255282500611','hours':'24/7','address':'Bugando Hill','lat':-2.5133,'lon':32.8997},
    {'name':'Mwanza Regional Hospital','type':'hospital','phone':'+255282500100','hours':'24/7','address':'Mwanza','lat':-2.5167,'lon':32.9000},
  ],
  'Arusha': [
    {'name':'Mount Meru Regional Hospital','type':'hospital','phone':'+255272508321','hours':'24/7','address':'Arusha','lat':-3.3667,'lon':36.6833},
    {'name':'Lutheran Hospital Arusha','type':'hospital','phone':'+255272507398','hours':'24/7','address':'Arusha','lat':-3.3700,'lon':36.6900},
    {'name':'Selian Lutheran Hospital','type':'hospital','phone':'+255272553000','hours':'24/7','address':'Selian','lat':-3.3200,'lon':36.6500},
  ],
  'Mbeya': [
    {'name':'Mbeya Zonal Referral Hospital','type':'hospital','phone':'+255252503567','hours':'24/7','address':'Mbeya','lat':-8.9094,'lon':33.4607},
    {'name':'Mbeya Regional Hospital','type':'hospital','phone':'+255252503200','hours':'24/7','address':'Mbeya','lat':-8.9150,'lon':33.4650},
  ],
  'Morogoro': [
    {'name':'Morogoro Regional Hospital','type':'hospital','phone':'+255232600320','hours':'24/7','address':'Morogoro','lat':-6.8218,'lon':37.6619},
    {'name':'Kilosa District Hospital','type':'hospital','phone':'+255232401100','hours':'24/7','address':'Kilosa','lat':-6.8333,'lon':36.9833},
  ],
  'Tanga': [
    {'name':'Bombo Regional Hospital','type':'hospital','phone':'+255272643640','hours':'24/7','address':'Tanga','lat':-5.0688,'lon':39.0987},
    {'name':'Muheza District Hospital','type':'hospital','phone':'+255272644100','hours':'24/7','address':'Muheza','lat':-4.9833,'lon':38.7833},
  ],
  'Kilimanjaro': [
    {'name':'KCMC','type':'hospital','phone':'+255272754377','hours':'24/7','address':'Moshi','lat':-3.3500,'lon':37.3333},
    {'name':'Moshi District Hospital','type':'hospital','phone':'+255272752324','hours':'24/7','address':'Moshi','lat':-3.3533,'lon':37.3400},
  ],
  'Tabora': [
    {'name':'Tabora Regional Referral Hospital','type':'hospital','phone':'+255262604255','hours':'24/7','address':'Tabora','lat':-5.0167,'lon':32.8000},
    {'name':'Igunga District Hospital','type':'hospital','phone':'+255262662100','hours':'24/7','address':'Igunga','lat':-4.2833,'lon':33.3167},
    {'name':'Nzega District Hospital','type':'hospital','phone':'+255262663100','hours':'24/7','address':'Nzega','lat':-4.2167,'lon':33.1833},
  ],
  'Kigoma': [
    {'name':'Maweni Regional Hospital','type':'hospital','phone':'+255282780360','hours':'24/7','address':'Kigoma','lat':-4.8833,'lon':29.6333},
    {'name':'Kibondo District Hospital','type':'hospital','phone':'+255282842100','hours':'24/7','address':'Kibondo','lat':-3.5833,'lon':30.6833},
  ],
  'Lindi': [
    {'name':'Lindi Regional Referral Hospital','type':'hospital','phone':'+255232202500','hours':'24/7','address':'Lindi','lat':-9.9989,'lon':39.7144},
    {'name':'Liwale District Hospital','type':'hospital','phone':'+255232403100','hours':'24/7','address':'Liwale','lat':-9.7667,'lon':37.9167},
  ],
  'Mtwara': [
    {'name':'Mtwara Regional Hospital','type':'hospital','phone':'+255232333500','hours':'24/7','address':'Mtwara','lat':-10.2667,'lon':40.1833},
    {'name':'Masasi District Hospital','type':'hospital','phone':'+255232510100','hours':'24/7','address':'Masasi','lat':-10.7167,'lon':38.8000},
    {'name':'Newala District Hospital','type':'hospital','phone':'+255232520100','hours':'24/7','address':'Newala','lat':-10.9333,'lon':39.2833},
  ],
  'Ruvuma': [
    {'name':'Songea Regional Hospital','type':'hospital','phone':'+255252602500','hours':'24/7','address':'Songea','lat':-10.6833,'lon':35.6500},
    {'name':'Mbinga District Hospital','type':'hospital','phone':'+255252640100','hours':'24/7','address':'Mbinga','lat':-10.9167,'lon':35.0167},
  ],
  'Shinyanga': [
    {'name':'Shinyanga Regional Hospital','type':'hospital','phone':'+255276003100','hours':'24/7','address':'Shinyanga','lat':-3.6636,'lon':33.4230},
    {'name':'Kahama District Hospital','type':'hospital','phone':'+255276003400','hours':'24/7','address':'Kahama','lat':-3.8333,'lon':32.6000},
  ],
  'Singida': [
    {'name':'Singida Regional Hospital','type':'hospital','phone':'+255262502600','hours':'24/7','address':'Singida','lat':-4.8189,'lon':34.7484},
    {'name':'Manyoni District Hospital','type':'hospital','phone':'+255262532100','hours':'24/7','address':'Manyoni','lat':-5.7500,'lon':34.8333},
  ],
  'Rukwa': [
    {'name':'Sumbawanga Regional Hospital','type':'hospital','phone':'+255282802500','hours':'24/7','address':'Sumbawanga','lat':-7.9667,'lon':31.6167},
    {'name':'Nkasi District Hospital','type':'hospital','phone':'+255282804100','hours':'24/7','address':'Nkasi','lat':-7.3833,'lon':30.6167},
  ],
  'Kagera': [
    {'name':'Kagera Regional Hospital','type':'hospital','phone':'+255282222500','hours':'24/7','address':'Bukoba','lat':-1.3322,'lon':31.8197},
    {'name':'Biharamulo District Hospital','type':'hospital','phone':'+255282310100','hours':'24/7','address':'Biharamulo','lat':-2.6333,'lon':31.3000},
  ],
  'Katavi': [{'name':'Mpanda Regional Hospital','type':'hospital','phone':'+255282602500','hours':'24/7','address':'Mpanda','lat':-6.3500,'lon':31.0667}],
  'Manyara': [
    {'name':'Babati District Hospital','type':'hospital','phone':'+255272553200','hours':'24/7','address':'Babati','lat':-3.7833,'lon':35.7500},
    {'name':'Hanang District Hospital','type':'hospital','phone':'+255272554100','hours':'24/7','address':'Hanang','lat':-4.4333,'lon':35.4000},
  ],
  'Mara': [
    {'name':'Musoma Regional Hospital','type':'hospital','phone':'+255282622500','hours':'24/7','address':'Musoma','lat':-1.5000,'lon':33.8000},
    {'name':'Tarime District Hospital','type':'hospital','phone':'+255282640100','hours':'24/7','address':'Tarime','lat':-1.3500,'lon':34.1667},
  ],
  'Geita':  [{'name':'Geita District Hospital','type':'hospital','phone':'+255282320100','hours':'24/7','address':'Geita','lat':-2.8667,'lon':32.2333}],
  'Njombe': [
    {'name':'Njombe Regional Hospital','type':'hospital','phone':'+255262702900','hours':'24/7','address':'Njombe','lat':-9.3333,'lon':34.7667},
    {'name':'Makete District Hospital','type':'hospital','phone':'+255262703100','hours':'24/7','address':'Makete','lat':-9.0167,'lon':34.0333},
  ],
  'Pwani': [
    {'name':'Coast Regional Hospital','type':'hospital','phone':'+255232402500','hours':'24/7','address':'Kibaha','lat':-6.7667,'lon':38.9167},
    {'name':'Rufiji District Hospital','type':'hospital','phone':'+255232403100','hours':'24/7','address':'Utete','lat':-7.9833,'lon':38.7667},
  ],
  'Simiyu': [{'name':'Bariadi District Hospital','type':'hospital','phone':'+255282752100','hours':'24/7','address':'Bariadi','lat':-2.8000,'lon':34.0667}],
  'Songea': [{'name':'Songea Regional Hospital','type':'hospital','phone':'+255252602500','hours':'24/7','address':'Songea','lat':-10.6833,'lon':35.6500}],
  'Zanzibar West': [
    {'name':'Mnazi Mmoja Hospital','type':'hospital','phone':'+255242230114','hours':'24/7','address':'Stone Town','lat':-6.1659,'lon':39.1897},
    {'name':'Kidongo Chekundu Health Centre','type':'clinic','phone':'+255242230500','hours':'24/7','address':'Zanzibar Town','lat':-6.1600,'lon':39.1950},
  ],
  'Zanzibar North': [{'name':'Kivunge District Hospital','type':'hospital','phone':'+255242234100','hours':'24/7','address':'Kivunge','lat':-5.7167,'lon':39.2500}],
  'Zanzibar South': [{'name':'Makunduchi District Hospital','type':'hospital','phone':'+255242235100','hours':'24/7','address':'Makunduchi','lat':-6.3833,'lon':39.5333}],
  'Pemba North':  [{'name':'Chake Chake Regional Hospital','type':'hospital','phone':'+255242452500','hours':'24/7','address':'Chake Chake','lat':-5.0333,'lon':39.7667}],
  'Pemba South':  [{'name':'Mkoani District Hospital','type':'hospital','phone':'+255242453100','hours':'24/7','address':'Mkoani','lat':-5.3667,'lon':39.6500}],
}

@router.get("/districts")
async def list_districts():
    return {"districts": list(CLINICS.keys())}

@router.get("/{district}")
async def get_clinics(district: str):
    curated = CLINICS.get(district, [])

    cached = _osm_cache.get(district)
    ttl = _OSM_CACHE_TTL if (cached and cached["data"]) else 60  # retry quickly if last attempt was empty
    if cached and (time.time() - cached["time"]) < ttl:
        osm = cached["data"]
    else:
        coords = DISTRICT_COORDS.get(district)
        osm = await fetch_osm_facilities(coords["lat"], coords["lon"]) if coords else []
        _osm_cache[district] = {"time": time.time(), "data": osm}

    return {"clinics": merge_clinics(curated, osm), "emergency": "112"}
