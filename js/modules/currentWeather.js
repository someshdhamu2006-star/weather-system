/**
 * currentWeather.js
 * ---------------------------------------------------------
 * Use Case 2: View Current Weather
 * Actors: User, Weather Data Provider, Reporter
 *
 * Normal flow implemented here:
 *  1. User selects a location            -> triggered via render(location, data)
 *  2. System requests current weather    -> handled by weatherService (app.js orchestrates)
 *  3. Weather data provider returns data -> data passed in
 *  4. System displays temperature,
 *     humidity, rainfall, wind speed     -> DOM updates below
 *
 * Extra features: today's hourly strip, air quality index, and a
 * live °C / °F unit toggle.
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  const { weatherService } = global.Skyline;

  const section = document.getElementById("current-module");
  const locationEl = document.getElementById("current-location");
  const updatedEl = document.getElementById("current-updated");
  const tempEl = document.getElementById("current-temp");
  const conditionEl = document.getElementById("current-condition");
  const gaugeFill = document.getElementById("gauge-fill");

  const feelsLikeEl = document.getElementById("metric-feelslike");
  const humidityEl = document.getElementById("metric-humidity");
  const windEl = document.getElementById("metric-wind");
  const rainEl = document.getElementById("metric-rain");

  const aqiCard = document.getElementById("aqi-card");
  const aqiValueEl = document.getElementById("aqi-value");
  const aqiLabelEl = document.getElementById("aqi-label");

  const hourlyStrip = document.getElementById("hourly-strip");

  const unitToggle = document.getElementById("unit-toggle");

  const GAUGE_CIRCUMFERENCE = 578; // 2 * PI * r(92), matches CSS dasharray

  function tempToGaugeOffset(tempC, unit) {
    // Normalize to Celsius for the gauge scale regardless of display unit.
    const celsius = unit === "fahrenheit" ? ((tempC - 32) * 5) / 9 : tempC;
    const min = -20;
    const max = 45;
    const clamped = Math.max(min, Math.min(max, celsius));
    const ratio = (clamped - min) / (max - min);
    return GAUGE_CIRCUMFERENCE - ratio * GAUGE_CIRCUMFERENCE;
  }

  function gaugeColorFor(sky) {
    return (
      {
        "day-clear": "#f2a65a",
        "day-cloudy": "#9fb3c8",
        rain: "#4a90d9",
        "night-clear": "#6c5b7b",
        storm: "#d9603a",
      }[sky] || "#f2a65a"
    );
  }

  function formatUpdatedTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  function formatHour(isoString) {
    try {
      return new Date(isoString).toLocaleTimeString(undefined, { hour: "numeric" });
    } catch {
      return isoString;
    }
  }

  function renderHourly(hourly) {
    hourlyStrip.innerHTML = "";
    hourly.forEach((h, i) => {
      const meta = weatherService.describeCode(h.weatherCode);
      const cell = document.createElement("div");
      cell.className = "hourly-cell";
      cell.innerHTML = `
        <div class="hourly-cell__time">${i === 0 ? "Now" : formatHour(h.time)}</div>
        <div class="hourly-cell__icon" aria-hidden="true">${meta.icon}</div>
        <div class="hourly-cell__temp">${h.temperature}°</div>
        <div class="hourly-cell__rain">${h.rainChance}%</div>
      `;
      hourlyStrip.appendChild(cell);
    });
  }

  function renderAqi(air) {
    if (!air) {
      aqiCard.hidden = true;
      return;
    }
    const meta = weatherService.describeAqi(air.aqi);
    aqiValueEl.textContent = air.aqi;
    aqiLabelEl.textContent = meta.label;
    aqiCard.dataset.level = meta.level;
    aqiCard.hidden = false;
  }

  /**
   * Renders the current-conditions panel.
   * @param {{name:string, admin1?:string, country?:string}} place
   * @param {object} weatherData - result of weatherService.fetchWeather()
   * @param {"celsius"|"fahrenheit"} unit
   * @param {object|null} air - result of weatherService.fetchAirQuality()
   */
  function render(place, weatherData, unit, air) {
    const { current } = weatherData;
    const meta = weatherService.describeCode(current.weatherCode);

    const region = [place.admin1, place.country].filter(Boolean).join(", ");
    locationEl.textContent = region ? `${place.name}, ${region}` : place.name;
    updatedEl.textContent = `Last updated ${formatUpdatedTime(current.time)}`;

    const unitSuffix = unit === "fahrenheit" ? "°F" : "°C";
    tempEl.textContent = `${current.temperature}°`;
    conditionEl.textContent = `${meta.icon} ${meta.label}`;

    feelsLikeEl.textContent = `${current.feelsLike}${unitSuffix}`;
    humidityEl.textContent = `${current.humidity}%`;
    windEl.textContent = `${current.windSpeed} km/h`;
    rainEl.textContent = `${current.rainfall} mm`;

    unitToggle.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.unit === unit);
    });

    gaugeFill.style.stroke = gaugeColorFor(meta.sky);
    gaugeFill.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = String(tempToGaugeOffset(current.temperature, unit));
    });

    document.body.setAttribute("data-sky", meta.sky);

    renderHourly(weatherData.hourly || []);
    renderAqi(air);

    section.hidden = false;
  }

  unitToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-unit]");
    if (!btn) return;
    global.Skyline.app.setUnit(btn.dataset.unit);
  });

  global.Skyline = global.Skyline || {};
  global.Skyline.currentWeather = { render };
})(window);
