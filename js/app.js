/**
 * app.js
 * ---------------------------------------------------------
 * Main controller. Owns application state (selected location +
 * display unit) and coordinates the use-case modules with the
 * shared weatherService "data provider".
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  const { weatherService, currentWeather, weatherForecast } = global.Skyline;

  const emptyState = document.getElementById("empty-state");
  const statusBanner = document.getElementById("status-banner");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");

  const UNIT_KEY = "skyline:unit";

  let state = {
    place: null, // { name, admin1, country, latitude, longitude, timezone }
    unit: localStorage.getItem(UNIT_KEY) || "celsius",
  };

  function setStatus(message, type = "error") {
    if (!message) {
      statusBanner.hidden = true;
      statusBanner.textContent = "";
      return;
    }
    statusBanner.hidden = false;
    statusBanner.textContent = message;
    statusBanner.classList.toggle("is-info", type === "info");
  }

  function setLoading(isLoading) {
    searchBtn.disabled = isLoading;
    searchBtn.textContent = isLoading ? "Searching…" : "Search";
  }

  async function renderForLocation(place) {
    const [data, air] = await Promise.all([
      weatherService.fetchWeather(place.latitude, place.longitude, place.timezone || "auto", state.unit),
      weatherService.fetchAirQuality(place.latitude, place.longitude),
    ]);

    emptyState.hidden = true;
    currentWeather.render(place, data, state.unit, air);
    weatherForecast.render(data);
  }

  /**
   * Central entry point used by the Search Location module (UC1)
   * once a place has been chosen. Fetches weather (UC2/UC3 data)
   * and renders both panels.
   */
  async function loadLocation(place) {
    state.place = place;
    setLoading(true);
    setStatus(null);

    try {
      await renderForLocation(place);
    } catch (err) {
      // Exceptions from UC2/UC3: weather data unavailable / API failure.
      setStatus(
        err.message || "Weather data is unavailable right now. Please try again shortly.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Used by the Refresh Data module (UC4) — re-fetches for whatever
   * location is currently loaded, without requiring a new search.
   */
  async function refreshCurrentLocation() {
    if (!state.place) {
      setStatus("Search for a location first, then you can refresh its weather.", "info");
      return;
    }

    try {
      await renderForLocation(state.place);
      setStatus(null);
    } catch (err) {
      // Exceptions from UC4: server timeout / network error / data unavailable.
      setStatus(
        err.message || "Couldn’t refresh weather data. Check your connection and try again.",
        "error"
      );
    }
  }

  /**
   * Extra feature: live °C / °F toggle — re-fetches so the API itself
   * does the conversion (keeps rounding consistent), then re-renders.
   */
  async function setUnit(unit) {
    if (unit === state.unit) return;
    state.unit = unit;
    localStorage.setItem(UNIT_KEY, unit);
    if (state.place) {
      try {
        await renderForLocation(state.place);
      } catch (err) {
        setStatus(err.message || "Couldn’t update units right now.", "error");
      }
    }
  }

  function init() {
    searchInput.focus();
  }

  document.addEventListener("DOMContentLoaded", init);

  global.Skyline = global.Skyline || {};
  global.Skyline.app = {
    loadLocation,
    refreshCurrentLocation,
    setStatus,
    setUnit,
  };
})(window);
