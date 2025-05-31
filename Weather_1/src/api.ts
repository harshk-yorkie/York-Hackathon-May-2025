import axios from 'axios';

const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';

export async function fetchWeatherData(city: string) {
  const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`);
  return response.data;
}