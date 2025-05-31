import axios from 'axios';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const fetchWeatherData = async (city) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric'
      }
    });
    const { name, main, weather } = response.data;
    return {
      city: name,
      temperature: main.temp,
      condition: weather[0].description
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Could not fetch weather data');
  }
};