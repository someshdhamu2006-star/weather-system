/**
 * weatherForecast.js
 * ---------------------------------------------------------
 * Use Case 3: View Weather Forecast
 * Actors: User, Weather Data Analyzer, Weather Data Provider
 *
 * Normal flow implemented here:
 *  1. User selects forecast option        -> forecast renders automatically
 *     alongside current weather (Alternative Flow in the SRS)
 *  2. System requests forecast data       -> handled by weatherService (app.js)
 *  3. Weather data analyzer processes it  -> aggregation/formatting below
 *  4. System displays forecast for
 *     upcoming days                       -> DOM cards below
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  const { weatherService } = global.Skyline;

  const section = document.getElementById("forecast-module");
  const strip = document.getElementById("forecast-strip");

  function dayLabel(dateStr, index) {
    if (index === 0) return "Today";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }

  /**
   * Renders the 7-day forecast strip ("Weather Data Analyzer" formatting step).
   * @param {object} weatherData - result of weatherService.fetchWeather()
   */
  function render(weatherData) {
    strip.innerHTML = "";

    weatherData.daily.forEach((day, i) => {
      const meta = weatherService.describeCode(day.weatherCode);
      const card = document.createElement("div");
      card.className = "forecast-day";
      card.innerHTML = `
        <div class="forecast-day__label">${dayLabel(day.date, i)}</div>
        <div class="forecast-day__icon" aria-hidden="true">${meta.icon}</div>
        <div class="forecast-day__high">${day.tempMax}°</div>
        <div class="forecast-day__low">${day.tempMin}°</div>
        <div class="forecast-day__rain">💧 ${day.rainSum} mm</div>
      `;
      strip.appendChild(card);
    });

    section.hidden = false;
  }

  global.Skyline = global.Skyline || {};
  global.Skyline.weatherForecast = { render };
})(window);
