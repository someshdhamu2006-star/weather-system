/**
 * searchLocation.js
 * ---------------------------------------------------------
 * Use Case 1: Search Location
 * Actors: User, Reporter, Administrator
 *
 * Normal flow implemented here:
 *  1. User opens the application            -> handled by app.js init
 *  2. User enters the location name          -> input listener
 *  3. System validates the location          -> geocode() + empty check
 *  4. System retrieves weather data          -> delegated to app.js
 *  5. Location details are displayed         -> delegated to currentWeather.js
 *
 * Alternative flow: User selects a location from suggested search results.
 * Enhancement: if the picked result is a whole city, the system also
 * offers the specific areas/neighbourhoods inside it (e.g. searching
 * "Chennai" surfaces T Nagar, Anna Nagar, Velachery...) so the user can
 * narrow down to the exact part of town before viewing weather.
 * Extra entry point: "Use my location" via the browser's geolocation.
 * Exceptions handled: invalid location, network/connection unavailable.
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  const { weatherService } = global.Skyline;

  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const suggestionsList = document.getElementById("search-suggestions");
  const locateBtn = document.getElementById("locate-btn");
  const areaPanel = document.getElementById("area-panel");
  const areaList = document.getElementById("area-list");
  const areaCityName = document.getElementById("area-city-name");
  const areaSkipBtn = document.getElementById("area-skip-btn");
  const recentList = document.getElementById("recent-list");

  const RECENTS_KEY = "skyline:recent-searches";
  const RECENTS_MAX = 6;

  let debounceTimer = null;
  let activeIndex = -1;
  let currentResults = [];

  // ---------- Recent searches (localStorage) ----------
  function getRecents() {
    try {
      return JSON.parse(localStorage.getItem(RECENTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveRecent(place) {
    const recents = getRecents().filter(
      (p) => !(p.name === place.name && p.admin1 === place.admin1)
    );
    recents.unshift({
      name: place.name,
      admin1: place.admin1,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, RECENTS_MAX)));
    renderRecents();
  }

  function renderRecents() {
    const recents = getRecents();
    recentList.innerHTML = "";
    if (!recents.length) {
      recentList.hidden = true;
      return;
    }
    recents.forEach((place) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = place.name;
      chip.title = [place.name, place.admin1].filter(Boolean).join(", ");
      chip.addEventListener("click", () => selectPlace(place));
      recentList.appendChild(chip);
    });
    recentList.hidden = false;
  }

  // ---------- Suggestions dropdown ----------
  function renderSuggestions(results) {
    currentResults = results;
    activeIndex = -1;
    suggestionsList.innerHTML = "";

    if (!results.length) {
      suggestionsList.hidden = true;
      return;
    }

    results.forEach((place, i) => {
      const li = document.createElement("li");
      const region = [place.admin1, place.country].filter(Boolean).join(", ");
      const badge = place.type === "area" ? "📍 Area" : place.type === "city" ? "🏙️ City" : "";
      li.innerHTML = `${place.name}<small>${region}${badge ? " · " + badge : ""}</small>`;
      li.setAttribute("role", "option");
      li.addEventListener("click", () => selectPlace(place));
      li.dataset.index = String(i);
      suggestionsList.appendChild(li);
    });

    suggestionsList.hidden = false;
  }

  function clearSuggestions() {
    suggestionsList.hidden = true;
    suggestionsList.innerHTML = "";
    currentResults = [];
    activeIndex = -1;
  }

  // ---------- Areas-in-city panel ----------
  function hideAreaPanel() {
    areaPanel.hidden = true;
    areaList.innerHTML = "";
  }

  async function maybeShowAreasInCity(cityPlace) {
    hideAreaPanel();
    if (cityPlace.type === "area") return; // already granular, nothing more to offer

    const areas = await weatherService.getAreasInCity(cityPlace);
    if (!areas.length) return;

    areaCityName.textContent = cityPlace.name;
    areaList.innerHTML = "";
    areas.forEach((area) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = area.name;
      chip.addEventListener("click", () => finalizeSelection(area));
      areaList.appendChild(chip);
    });
    areaPanel.hidden = false;
  }

  function finalizeSelection(place) {
    hideAreaPanel();
    input.value = [place.name, place.admin1].filter(Boolean).join(", ");
    saveRecent(place);
    global.Skyline.app.loadLocation(place);
  }

  // Selecting a city first shows its areas (if any); picking an area,
  // or a city with no listed areas, loads weather right away.
  async function selectPlace(place) {
    input.value = [place.name, place.admin1].filter(Boolean).join(", ");
    clearSuggestions();

    if (place.type !== "area") {
      // "city", "district", "region", or unclassified "place" results can
      // all have specific localities nearby — e.g. searching "Vellore"
      // often resolves to a district/administrative entry rather than a
      // node explicitly typed "city", so we still try the area lookup.
      global.Skyline.app.setStatus("Loading weather for " + place.name + "…", "info");
      finalizeSelection(place); // show weather immediately...
      await maybeShowAreasInCity(place); // ...then offer a more specific area
      return;
    }

    finalizeSelection(place);
  }

  areaSkipBtn.addEventListener("click", hideAreaPanel);

  // ---------- Typing / auto-suggest ----------
  input.addEventListener("input", () => {
    const query = input.value;
    clearTimeout(debounceTimer);
    hideAreaPanel();

    if (query.trim().length < 2) {
      clearSuggestions();
      return;
    }

    // Debounced ~500ms to stay within Nominatim's fair-use rate limit.
    debounceTimer = setTimeout(async () => {
      try {
        const results = await weatherService.geocode(query);
        renderSuggestions(results);
      } catch (err) {
        clearSuggestions();
      }
    }, 500);
  });

  input.addEventListener("keydown", (e) => {
    if (suggestionsList.hidden || !currentResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === "Escape") {
      clearSuggestions();
      return;
    } else {
      return;
    }

    [...suggestionsList.children].forEach((li, i) => {
      li.classList.toggle("is-active", i === activeIndex);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (activeIndex >= 0 && currentResults[activeIndex]) {
      selectPlace(currentResults[activeIndex]);
      return;
    }

    const query = input.value.trim();
    if (!query) return;

    try {
      global.Skyline.app.setStatus("Searching for “" + query + "”…", "info");
      const results = await weatherService.geocode(query);

      if (!results.length) {
        global.Skyline.app.setStatus(
          `No location found for “${query}”. Check the spelling and try again.`,
          "error"
        );
        return;
      }

      selectPlace(results[0]);
    } catch (err) {
      global.Skyline.app.setStatus(
        "Couldn’t reach the location service. Check your internet connection and try again.",
        "error"
      );
    }
  });

  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) clearSuggestions();
  });

  // ---------- Use my location ----------
  locateBtn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      global.Skyline.app.setStatus("Geolocation isn't supported by this browser.", "error");
      return;
    }

    global.Skyline.app.setStatus("Finding your location…", "info");
    locateBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await weatherService.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          finalizeSelection(place);
        } catch (err) {
          global.Skyline.app.setStatus(err.message || "Couldn't identify your location.", "error");
        } finally {
          locateBtn.disabled = false;
        }
      },
      () => {
        global.Skyline.app.setStatus(
          "Location permission denied. Search for a place instead.",
          "error"
        );
        locateBtn.disabled = false;
      },
      { timeout: 10000 }
    );
  });

  renderRecents();

  global.Skyline = global.Skyline || {};
  global.Skyline.searchLocation = { clearSuggestions };
})(window);
