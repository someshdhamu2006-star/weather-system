/**
 * refreshData.js
 * ---------------------------------------------------------
 * Use Case 4: Refresh Weather Data
 * Actors: User, Administrator, Weather Data Provider
 *
 * Normal flow implemented here:
 *  1. User clicks Refresh                       -> click listener
 *  2. System sends request to data provider     -> app.refreshCurrentLocation()
 *  3. Latest weather information is received    -> handled by weatherService
 *  4. System updates displayed weather details  -> re-renders current + forecast
 *
 * Alternative flow: System automatically refreshes data at
 * predefined intervals (auto-refresh toggle, business rule:
 * refresh interval follows system policy — set below).
 * ---------------------------------------------------------
 */
(function (global) {
  "use strict";

  // Business rule: auto-refresh interval per system policy.
  const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

  const refreshBtn = document.getElementById("refresh-btn");
  const autoToggle = document.getElementById("auto-refresh-toggle");

  let autoTimer = null;

  async function handleRefresh() {
    if (refreshBtn.classList.contains("is-spinning")) return; // avoid duplicate/overlapping requests

    refreshBtn.classList.add("is-spinning");
    refreshBtn.disabled = true;

    try {
      await global.Skyline.app.refreshCurrentLocation();
    } finally {
      refreshBtn.classList.remove("is-spinning");
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", handleRefresh);

  autoToggle.addEventListener("change", () => {
    if (autoToggle.checked) {
      autoTimer = setInterval(handleRefresh, AUTO_REFRESH_INTERVAL_MS);
      global.Skyline.app.setStatus(
        "Auto-refresh is on — weather data will update every 5 minutes.",
        "info"
      );
    } else if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  });

  global.Skyline = global.Skyline || {};
  global.Skyline.refreshData = { handleRefresh };
})(window);
