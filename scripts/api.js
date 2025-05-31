// scripts/api.js
import { withRetry } from './utils.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch coordinates for a city name
 */
export async function getCoordinates(city) {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(city)}&format=json&limit=1`;
    return withRetry(async () => {
        const res = await fetch(url, { headers: { "User-Agent": "WeatherCompareBot/1.0" } });
        if (!res.ok) throw new Error('Geo API Error');
        const d = await res.json();
        if (!d.length) throw new Error(`City not found: ${city}`);
        return { city: city, lat: d[0].lat, lon: d[0].lon, display: d[0].display_name };
    });
}

/**
 * Get current + day temperature trend for city (lat/lon)
 */
export async function getWeather(lat, lon) {
    // Past 1 day temps for sparkline (hourly)
    const now = new Date();
    const start = new Date(now.getTime() - 24*60*60*1000);
    // Build ISO date strings
    const pastHour = `${start.getFullYear()}-${start.getMonth()+1}-${start.getDate()}T${String(start.getHours()).padStart(2,'0')}:00`;
    const nowHour = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}T${String(now.getHours()).padStart(2,'0')}:00`;
    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      `current_weather=true`,
      `hourly=temperature_2m`,
      `start_date=${pastHour.split('T')[0]}`,
      `end_date=${nowHour.split('T')[0]}`
    ].join('&');
    return withRetry(async () => {
        const res = await fetch(`${METEO_URL}?${params}`);
        if (!res.ok) throw new Error('Weather API Error');
        const d = await res.json();
        if (!d.current_weather || !d.hourly) throw new Error('Incomplete Weather Data');
        // Extract 24hr sparkline values if available
        let temps = d.hourly.temperature_2m || [];
        return {
            ...d.current_weather,
            trend: temps.slice(-24), // last 24hrs for sparkline
        };
    });
}

/**
 * Bulk fetch for multiple cities [cityNames]
 */
export async function getWeatherForCities(cityNames, setProgress) {
    let results = [];
    for (let i = 0; i < cityNames.length; ++i) {
      if (setProgress) setProgress(i/cityNames.length);
      const city = cityNames[i];
      try {
        const geo = await getCoordinates(city);
        const weather = await getWeather(geo.lat, geo.lon);
        results.push({
          city: properDisplayName(city),
          geo,
          weather
        });
      } catch (e) {
        results.push({ error: e.message, city });
      }
    }
    if (setProgress) setProgress(1);
    return results;
}

function properDisplayName(c) {
    return c.split(/\s+/).map(x => x[0] ? (x[0].toUpperCase() + x.slice(1).toLowerCase()) : '').join(' ');
}
