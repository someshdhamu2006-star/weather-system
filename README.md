# Skyline — Weather Forecasting System (Frontend)

A fully working, static frontend for the **Weather Forecasting System** described in
`24MIS0046_VL2026270101971_AST01` (ISWE406P — Agile Development Process and DevOps Lab).

No build step, no API key, no backend required — it runs entirely in the browser and
pulls live data from the free [Open-Meteo](https://open-meteo.com) APIs.

## Live features

- **Search Location** — type a city *or a specific area* (e.g. "T Nagar" or just
  "Chennai") and pick from live auto-suggestions or press Enter.
  - **Area-level results**: search now uses OpenStreetMap/Nominatim, which resolves
    down to suburbs/neighbourhoods, not just whole cities.
  - **Areas-in-a-city panel**: if you search a whole city (e.g. "Chennai"), the app
    also looks up the specific localities inside it (T Nagar, Anna Nagar, Velachery,
    Mylapore, Adyar, …) via the Overpass API and lets you pick the exact area — or
    skip and use the city center.
  - **Use my location** — the 📍 button next to Search uses the browser's geolocation
    and reverse-geocodes it to the nearest named area.
  - **Recent searches** — your last few picks appear as quick-tap chips.
- **View Current Weather** — temperature, feels-like, humidity, wind speed, rainfall,
  and air quality (US AQI), shown on an animated instrument-style gauge, plus an
  hourly strip for the next 8 hours.
  - **°C / °F toggle** — switch units live; your choice is remembered.
- **View Weather Forecast** — 7-day outlook strip with high/low and rainfall per day.
- **Refresh Weather Data** — manual refresh button plus an optional auto-refresh
  (every 5 minutes) toggle.
- An ambient sky background that shifts color/mood (clear / cloudy / rain / storm /
  night) based on the real weather code returned for the searched location.

## Project structure (module-wise, matching the SRS use cases)

```
weather-forecasting-system/
├── index.html                     # App shell, all 4 module sections + sky backdrop
├── css/
│   └── style.css                  # Design system (tokens, gauge, layout, responsive)
├── js/
│   ├── services/
│   │   └── weatherService.js       # "Weather Data Provider" — Open-Meteo API wrapper
│   ├── modules/
│   │   ├── searchLocation.js       # UC1 Search Location
│   │   ├── currentWeather.js       # UC2 View Current Weather
│   │   ├── weatherForecast.js      # UC3 View Weather Forecast
│   │   └── refreshData.js          # UC4 Refresh Weather Data
│   └── app.js                      # Main controller / state, wires modules together
└── README.md
```

Each module file's header comment maps its code directly back to the **Normal Flow**,
**Alternative Flow**, and **Exceptions** steps written in the corresponding use case in
the assessment document, so you can cross-reference the SRS with the implementation
when writing your lab report.

| Use Case | Actors (per SRS)                                      | File                          |
|----------|--------------------------------------------------------|-------------------------------|
| UC1 Search Location        | User, Reporter, Administrator                 | `js/modules/searchLocation.js` |
| UC2 View Current Weather    | User, Weather Data Provider, Reporter         | `js/modules/currentWeather.js` |
| UC3 View Weather Forecast   | User, Weather Data Analyzer, Weather Data Provider | `js/modules/weatherForecast.js` |
| UC4 Refresh Weather Data    | User, Administrator, Weather Data Provider    | `js/modules/refreshData.js`   |

## Running it locally

No install needed — it's plain HTML/CSS/JS. Any of these work:

1. **Just open the file**: double-click `index.html` (or `open index.html` / `start index.html`).
2. **Or serve it** (recommended, avoids any browser file:// restrictions):
   ```bash
   cd weather-forecasting-system
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```

## Pushing to GitHub

```bash
cd weather-forecasting-system
git init
git add .
git commit -m "Initial commit: Weather Forecasting System frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Optional: deploy for free with GitHub Pages

1. Push the repo as above.
2. On GitHub: **Settings → Pages → Source → Deploy from branch → `main` / `root`**.
3. Your app will be live at `https://<your-username>.github.io/<your-repo>/`.

## Notes

- Data sources (all free, no API key required):
  - [Open-Meteo](https://open-meteo.com/) — current conditions, 7-day + hourly
    forecast, and air quality. Good fit for the SRS's "Weather Data Provider" actor.
  - [Nominatim](https://nominatim.org/) (OpenStreetMap) — location search and reverse
    geocoding, with suburb/neighbourhood-level detail.
  - [Overpass API](https://overpass-api.de/) (OpenStreetMap) — looks up the specific
    areas inside a searched city.
- Weather codes are mapped from the standard WMO codes Open-Meteo returns.
- All four use cases' listed **Exceptions** are handled with an on-screen status banner
  (invalid location, no results, network/API failure).
- Nominatim/Overpass are public, rate-limited community services (roughly 1 request/
  second) — fine for a lab project or small class demo. For a production deployment,
  swap in a commercial geocoder (Google Places, Mapbox, LocationIQ) with an API key.
- The "areas inside a city" lookup uses an Overpass radius search (15km) around the
  city's coordinates, so it works for smaller cities too (e.g. Vellore), not just
  metros with a full OSM admin-boundary relation. It still depends on OpenStreetMap
  volunteers having tagged `place=suburb/neighbourhood/quarter/town/village` nodes
  nearby — if a place genuinely has none tagged, the panel is skipped and you just
  get that location's own weather, which is expected, not a bug.
