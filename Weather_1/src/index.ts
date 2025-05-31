import { fetchWeatherData } from './api';

const cities = ['London', 'New York', 'Tokyo'];

async function displayWeatherData() {
  const weatherData = await Promise.all(cities.map(city => fetchWeatherData(city)));
  // Display the data in a table
}

displayWeatherData();