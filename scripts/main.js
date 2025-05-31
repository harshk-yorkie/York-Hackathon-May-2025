// scripts/main.js

document.addEventListener("DOMContentLoaded", () => {
  const cityForm = document.getElementById('city-form');
  const cityInput = document.getElementById('cities-input');
  const compareBtn = document.getElementById('compare-btn');
  const formError = document.getElementById('form-error');
  const loadingSection = document.getElementById('loading');
  const weatherTableSection = document.getElementById('weather-table-section');
  const apiError = document.getElementById('api-error');

  function setLoading(isLoading) {
    loadingSection.hidden = !isLoading;
    weatherTableSection.hidden = isLoading;
    apiError.hidden = true;
    compareBtn.disabled = isLoading;
  }

  /**
   * Build a beautiful weather comparison table
   * @param {Array} cityWeatherList
   */
  function renderWeatherTable(cityWeatherList) {
    if (!Array.isArray(cityWeatherList) || !cityWeatherList.length) {
      weatherTableSection.innerHTML = '';
      return;
    }
    const metrics = [
      { label: 'City', key: 'name' },
      { label: 'Country', key: 'country', fn: val => getFlagEmoji(val) + " " + val },
      { label: 'Temperature (°C)', key: 'temperature' },
      { label: 'Wind (m/s)', key: 'windspeed' },
      { label: 'Humidity (%)', key: 'humidity', optional: true },
      { label: 'Time', key: 'time' }
    ];
    let table = `<table class="weather-table" aria-label="Weather Comparison Table"><thead><tr>` +
      cityWeatherList.map(cw => `<th>${cw.name}</th>`).join('') + '</tr></thead>';
    table += '<tbody>';
    metrics.forEach(metric => {
      table += '<tr>' + cityWeatherList.map(cw => {
        let value = cw[metric.key] ?? '';
        if (metric.fn) value = metric.fn(value);
        if (metric.key === 'temperature') value = (typeof value === 'number' ? value.toFixed(1) : value);
        return `<td>${value}</td>`;
      }).join('') + '</tr>';
    });
    table += '</tbody></table>';
    weatherTableSection.innerHTML = table;
  }

  async function fetchAllCitiesWeather(cities) {
    setLoading(true);
    hideError(formError);
    apiError.hidden = true;
    const cityData = [];
    try {
      for (const city of cities) {
        // Delay to avoid Nominatim throttling
        await sleep(100);
        const cInfo = await getCoordinates(city);
        const weather = await getCurrentWeather(cInfo.lat, cInfo.lon);
        cityData.push({
          name: toTitleCase(cInfo.name),
          country: cInfo.country,
          temperature: weather.temperature,
          windspeed: weather.windspeed,
          humidity: weather.relativehumidity ?? '-',
          time: weather.time
        });
      }
      renderWeatherTable(cityData);
    } catch (err) {
      showError(err.message, apiError);
      weatherTableSection.innerHTML = '';
    } finally {
      setLoading(false);
    }
  }

  // Form Event Handling
  cityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideError(formError);
    apiError.hidden = true;
    const cities = parseCities(cityInput.value);
    if (cities.length < 3) {
      showError('Please enter at least 3 unique city names (separated by commas).', formError);
      weatherTableSection.innerHTML = '';
      return;
    }
    fetchAllCitiesWeather(cities);
  });

  // Allow Enter key to submit (accessibility)
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      compareBtn.focus();
      cityForm.dispatchEvent(new Event('submit'));
    }
  });

});
