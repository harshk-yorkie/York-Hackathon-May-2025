import { fetchWeatherData } from './api';

const cities = ['London', 'New York', 'Tokyo'];

async function displayWeatherData() {
  const data = await Promise.all(cities.map(city => fetchWeatherData(city)));

  // Display the data in a table
  // Implement the sorting and delta mode
}

displayWeatherData();