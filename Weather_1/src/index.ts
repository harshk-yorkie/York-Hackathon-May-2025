import { fetchWeatherData } from './api';
import { compareCities, sortData } from './utils';

async function main() {
  const cities = ['London', 'Paris', 'New York'];
  const weatherData = await fetchWeatherData(cities);
  const sortedData = sortData(weatherData);
  const comparisonTable = compareCities(sortedData);
  console.log(comparisonTable);
}

main();