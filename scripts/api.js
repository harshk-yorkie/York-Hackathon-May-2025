// scripts/api.js

/**
 * Fetches geocoordinates for a city using the Nominatim API.
 * 3 retry attempts, 1s delay each, with error explanation.
 * @param {string} city
 * @returns {Promise<object>} { name, lat, lon, country }
 */
async function getCoordinates(city) {
  const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  let lastErr;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const res = await fetch(endpoint, { headers: { 'accept-language': 'en' } });
      if (!res.ok) throw new Error("API error: " + res.status + " " + res.statusText);
      const json = await res.json();
      if (!json.length) throw new Error("No results found.");
      return {
        name: json[0].display_name.split(',')[0],
        lat: json[0].lat,
        lon: json[0].lon,
        country: json[0].address?.country_code?.toUpperCase() || ''
      };
    } catch (err) {
      lastErr = err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`Geocoding for '${city}' failed: ${lastErr.message}`);
}

/**
 * Fetches current weather using Open-Meteo API (with 3 retry)
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>} weather info
 */
async function getCurrentWeather(lat, lon) {
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  let lastErr;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Weather API: ${res.status}`);
      const json = await res.json();
      if (!json.current_weather) throw new Error("Missing weather data");
      return json.current_weather;
    } catch (err) {
      lastErr = err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`Weather fetching failed: ${lastErr.message}`);
}

/**
 * Returns a flag emoji for a given ISO country code
 * @param {string} code (e.g. US, GB, IN)
 */
function getFlagEmoji(code) {
  if (!code) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c=>0x1f1e6-65+c.charCodeAt()));
}
