# MasjidNear.me API – Response structure

**Endpoint:** `GET https://api.masjidnear.me/v1/masjids/search?lat={lat}&lng={lng}&rad={meters}`

**Examples:**
- Toronto: `?lat=43.6532&lng=-79.3832&rad=25000`
- Waterloo: `?lat=43.4643&lng=-80.5204&rad=20000`

---

## Top-level shape

```json
{
  "code": 200,
  "status": "OK",
  "data": {
    "metaData": "{lat:43.6532, lng:-79.3832, radius:25000}",
    "masjids": [ ... ],
    "message": "Got 17 masjids for the search query",
    "errorDetails": ""
  }
}
```

- **`data.masjids`** – array of masjid objects (use this for parsing).

---

## Each masjid object

```json
{
  "_id": "680c010d6899b76be0d4adae",
  "masjidName": "Darul Arqam Islamic Centre",
  "masjidAddress": {
    "description": "620 Trethewey Drive, North York",
    "street": "",
    "zipcode": "",
    "country": "",
    "state": "",
    "city": "",
    "locality": "",
    "phone": "",
    "googlePlaceId": "ChIJLarT6TcxK4gRJsSYoz8xPqs"
  },
  "masjidLocation": {
    "coordinates": [-79.4944519, 43.6971772],
    "type": "Point"
  },
  "masjidTimings": {
    "fajr": "", "zuhr": "", "asr": "",
    "maghrib": "", "isha": "", "jumah": ""
  }
}
```

- **`masjidName`** – display name.
- **`masjidLocation.coordinates`** – `[longitude, latitude]` (GeoJSON order).
- **`_id`** – unique id.
- **`masjidAddress.description`** – full address string (optional).

---

## Testing keys & raw response

Use these routes to test the API and see the **full raw response** (structure, keys, patterns).

### Single-city test

- **`GET /api/masjids/test?city=Toronto&country=Canada`**  
  Returns `{ ok, status, url, city, country, count, rawKeys, sample }`.
- **`GET /api/masjids/test?city=Waterloo&country=Canada&raw=1`**  
  Same, plus **`rawResponse`** = full MasjidNear.me API body (use for structure / touch-up).

### Inspect Toronto, Waterloo, Lahore

- **`GET /api/masjids/inspect`**  
  Calls the API for Toronto, Waterloo, and Lahore. Returns **`results`** with per-city:
  - `url`, `ok`, `status`, `count`, `rawKeys`, `firstMasjidKeys`
  - **`rawResponse`** – full API response so you can compare patterns across cities.

---

## Canada cities (geo_centers)

Only **Toronto** and **Waterloo** are configured for Canada. Both have heatmap support.
