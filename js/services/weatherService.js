/**
 * weatherService.js
 * ---------------------------------------------------------
 * Acts as the "Weather Data Provider" actor from the SRS doc.
 *
 * Data sources (all free, no API key required):
 *   - Nominatim (OpenStreetMap) -> place search with area-level
 *     detail (suburb / neighbourhood / district), not just city.
 *   - Overpass API (OpenStreetMap) -> lists specific areas
 *     (suburbs/neighbourhoods) inside a chosen city, e.g.
 *     searching "Chennai" surfaces T Nagar, Anna Nagar, Velachery...
 *   - Open-Meteo -> current conditions + 7 day forecast + air quality
 *
 * Exposed on the global `Skyline` namespace so plain <script>
 * tags (no bundler) can share it across modules.
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
  const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

  // WMO weather codes -> human label + icon + sky mood.
  // Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
  const WEATHER_CODES = {
    0: { label: "Clear sky", icon: "☀️", sky: "day-clear" },
    1: { label: "Mostly clear", icon: "🌤️", sky: "day-clear" },
    2: { label: "Partly cloudy", icon: "⛅", sky: "day-cloudy" },
    3: { label: "Overcast", icon: "☁️", sky: "day-cloudy" },
    45: { label: "Fog", icon: "🌫️", sky: "day-cloudy" },
    48: { label: "Depositing rime fog", icon: "🌫️", sky: "day-cloudy" },
    51: { label: "Light drizzle", icon: "🌦️", sky: "rain" },
    53: { label: "Moderate drizzle", icon: "🌦️", sky: "rain" },
    55: { label: "Dense drizzle", icon: "🌧️", sky: "rain" },
    56: { label: "Freezing drizzle", icon: "🌧️", sky: "rain" },
    57: { label: "Freezing drizzle", icon: "🌧️", sky: "rain" },
    61: { label: "Slight rain", icon: "🌦️", sky: "rain" },
    63: { label: "Moderate rain", icon: "🌧️", sky: "rain" },
    65: { label: "Heavy rain", icon: "🌧️", sky: "rain" },
    66: { label: "Freezing rain", icon: "🌧️", sky: "rain" },
    67: { label: "Freezing rain", icon: "🌧️", sky: "rain" },
    71: { label: "Slight snow", icon: "🌨️", sky: "day-cloudy" },
    73: { label: "Moderate snow", icon: "🌨️", sky: "day-cloudy" },
    75: { label: "Heavy snow", icon: "❄️", sky: "day-cloudy" },
    77: { label: "Snow grains", icon: "❄️", sky: "day-cloudy" },
    80: { label: "Slight rain showers", icon: "🌦️", sky: "rain" },
    81: { label: "Moderate rain showers", icon: "🌧️", sky: "rain" },
    82: { label: "Violent rain showers", icon: "⛈️", sky: "storm" },
    85: { label: "Slight snow showers", icon: "🌨️", sky: "day-cloudy" },
    86: { label: "Heavy snow showers", icon: "❄️", sky: "day-cloudy" },
    95: { label: "Thunderstorm", icon: "⛈️", sky: "storm" },
    96: { label: "Thunderstorm, hail", icon: "⛈️", sky: "storm" },
    99: { label: "Thunderstorm, heavy hail", icon: "⛈️", sky: "storm" },
  };

  function describeCode(code) {
    return WEATHER_CODES[code] || { label: "Unknown", icon: "🌡️", sky: "day-cloudy" };
  }

  // US EPA AQI bands used by Open-Meteo's us_aqi field.
  function describeAqi(aqi) {
    if (aqi == null) return { label: "Unavailable", level: "n/a" };
    if (aqi <= 50) return { label: "Good", level: "good" };
    if (aqi <= 100) return { label: "Moderate", level: "moderate" };
    if (aqi <= 150) return { label: "Unhealthy for sensitive groups", level: "sensitive" };
    if (aqi <= 200) return { label: "Unhealthy", level: "unhealthy" };
    if (aqi <= 300) return { label: "Very unhealthy", level: "very-unhealthy" };
    return { label: "Hazardous", level: "hazardous" };
  }

  function placeTypeOf(addr, item) {
    if (addr.suburb || addr.neighbourhood || addr.quarter) return "area";
    if (addr.city_district || addr.borough) return "district";
    if (addr.city || addr.town || addr.village) return "city";
    return item.type === "administrative" ? "region" : "place";
  }

  // Builds a short, readable label + region line from a Nominatim address block,
  // preferring the most specific area name (suburb/neighbourhood) over the city.
  function formatPlace(item) {
    const addr = item.address || {};
    const specific = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district;
    const city = addr.city || addr.town || addr.village || addr.county || "";
    const state = addr.state || "";
    const country = addr.country || "";

    const name = specific || city || item.name || item.display_name.split(",")[0];
    const regionParts = specific ? [city, state] : [state];
    const region = [...regionParts, country].filter(Boolean).join(", ");

    return {
      name,
      admin1: region.replace(new RegExp(`,?\\s*${country}$`), "") || state,
      country,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      timezone: "auto",
      type: placeTypeOf(addr, item),
      osmType: item.osm_type, // "relation" | "way" | "node" — used to look up areas-in-city
      osmId: item.osm_id,
    };
  }

  /**
   * UC1 support: Search Location
   * Resolves free text into specific candidate places — cities AND
   * finer sub-areas (suburbs/neighbourhoods) when the query matches one.
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async function geocode(query) {
    if (!query || !query.trim()) return [];
    const url =
      `${NOMINATIM_URL}?q=${encodeURIComponent(query.trim())}` +
      `&format=jsonv2&addressdetails=1&limit=8&accept-language=en`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Location lookup failed. Please try again.");
    const data = await res.json();

    // Prefer real places (cities/areas) over roads, shops, etc.
    const ranked = data
      .filter((item) => item.address)
      .map(formatPlace);

    // De-duplicate identical name+region combos.
    const seen = new Set();
    return ranked.filter((p) => {
      const key = `${p.name}|${p.admin1}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * UC1 enhancement: when the user searches/selects a whole city
   * (e.g. "Chennai" or "Vellore"), fetch the specific areas/
   * neighbourhoods around it so they can narrow down to the exact
   * part of town — mirrors the SRS note "Auto-suggestions can
   * improve the user experience."
   *
   * Uses a radius search (Overpass `around`) centered on the city's
   * coordinates rather than requiring the city to be tagged as an
   * OSM admin-boundary relation — smaller towns are often only
   * tagged as a single node/way in OpenStreetMap, so relying on a
   * relation boundary silently returned nothing for places like
   * Vellore. Radius search works for any city regardless of how
   * it's tagged.
   * @param {{name:string, latitude:number, longitude:number, country?:string}} cityPlace
   * @param {number} [radiusMeters]
   * @returns {Promise<Array<{name, latitude, longitude}>>}
   */
  async function queryAreasOnce(latitude, longitude, radiusMeters) {
    // "nwr" = node, way, AND relation. Many localities are tagged on a
    // boundary way/relation rather than a plain point node — Nominatim's
    // search index includes those, so the Overpass lookup needs to as
    // well, or it silently misses places a plain node-only query would
    // have caught. "out center" gives ways/relations a usable lat/lon.
    const query = `
      [out:json][timeout:25];
      (
        nwr["place"~"^(suburb|neighbourhood|quarter|town|village|hamlet)$"]
          (around:${radiusMeters},${latitude},${longitude});
      );
      out center 80;
    `;

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements || [])
      .map((el) => ({
        name: el.tags && el.tags.name,
        lat: el.lat != null ? el.lat : el.center && el.center.lat,
        lon: el.lon != null ? el.lon : el.center && el.center.lon,
      }))
      .filter((el) => el.name && el.lat != null && el.lon != null);
  }

  async function getAreasInCity(cityPlace, radiusMeters = 15000) {
    const { latitude, longitude } = cityPlace;
    if (latitude == null || longitude == null) return [];

    try {
      let raw = await queryAreasOnce(latitude, longitude, radiusMeters);

      // Smaller towns can come back sparse at the default radius —
      // widen the net once before giving up.
      if (raw.length < 3 && radiusMeters < 30000) {
        raw = await queryAreasOnce(latitude, longitude, 30000);
      }

      const areas = raw
        .filter((el) => el.name !== cityPlace.name)
        .map((el) => ({
          name: el.name,
          admin1: cityPlace.name,
          country: cityPlace.country,
          latitude: el.lat,
          longitude: el.lon,
          timezone: "auto",
          type: "area",
          // straight-line distance from city center, for ranking
          _dist: Math.hypot(el.lat - latitude, el.lon - longitude),
        }));

      // Unique by name, closest first, capped to a manageable list.
      const seen = new Set();
      return areas
        .filter((a) => (seen.has(a.name) ? false : seen.add(a.name)))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 24)
        .map(({ _dist, ...a }) => a);
    } catch (err) {
      return []; // Non-critical enhancement — fail silently.
    }
  }

  /**
   * UC2 + UC3 support: View Current Weather / View Weather Forecast
   * Fetches current conditions and a 7-day daily forecast for a coordinate.
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} [timezone]
   * @param {"celsius"|"fahrenheit"} [unit]
   */
  async function fetchWeather(latitude, longitude, timezone = "auto", unit = "celsius") {
    const params = new URLSearchParams({
      latitude,
      longitude,
      timezone,
      temperature_unit: unit,
      wind_speed_unit: "kmh",
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
      ].join(","),
      hourly: ["temperature_2m", "weather_code", "precipitation_probability"].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max",
      ].join(","),
      forecast_days: 7,
    });

    const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Weather data provider is unavailable right now.");
    const data = await res.json();

    // Build next 8 hourly readings from "now" for a same-day hourly strip.
    const nowIndex = Math.max(
      0,
      data.hourly.time.findIndex((t) => t >= data.current.time)
    );
    const hourly = data.hourly.time
      .slice(nowIndex, nowIndex + 8)
      .map((time, i) => ({
        time,
        temperature: Math.round(data.hourly.temperature_2m[nowIndex + i]),
        weatherCode: data.hourly.weather_code[nowIndex + i],
        rainChance: data.hourly.precipitation_probability[nowIndex + i],
      }));

    return {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: Math.round(data.current.relative_humidity_2m),
        rainfall: data.current.precipitation,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        time: data.current.time,
      },
      hourly,
      daily: data.daily.time.map((date, i) => ({
        date,
        weatherCode: data.daily.weather_code[i],
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        rainSum: data.daily.precipitation_sum[i],
        windMax: Math.round(data.daily.wind_speed_10m_max[i]),
      })),
    };
  }

  /**
   * Extra feature: current air quality (US AQI) for the selected location.
   * @param {number} latitude
   * @param {number} longitude
   */
  async function fetchAirQuality(latitude, longitude) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: "us_aqi,pm2_5",
      timezone: "auto",
    });

    try {
      const res = await fetch(`${AIR_QUALITY_URL}?${params.toString()}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        aqi: Math.round(data.current.us_aqi),
        pm25: data.current.pm2_5,
      };
    } catch (err) {
      return null; // Non-critical enhancement — fail silently.
    }
  }

  /**
   * Extra feature: reverse-geocodes browser coordinates (from "Use my
   * location") back into a display name using the same address logic
   * as geocode(), so UC1 also supports geolocation as an entry point.
   */
  async function reverseGeocode(latitude, longitude) {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}` +
      `&format=jsonv2&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Couldn't identify your location.");
    const item = await res.json();
    return formatPlace(item);
  }

  global.Skyline = global.Skyline || {};
  global.Skyline.weatherService = {
    geocode,
    getAreasInCity,
    fetchWeather,
    fetchAirQuality,
    reverseGeocode,
    describeCode,
    describeAqi,
  };
})(window);
