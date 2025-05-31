import axios from 'axios';

const API_KEY = 'your_openweathermap_api_key';

export async function fetchWeatherData(cities: string[]) {
  const weatherData = [];
  for (const city of cities) {
    const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`);
    weatherData.push(response.data);
  }
  return weatherData;
}