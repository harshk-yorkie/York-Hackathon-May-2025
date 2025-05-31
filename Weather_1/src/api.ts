import axios from 'axios';

export async function getWeatherData(cities: string[]) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const results = await Promise.all(
    cities.map(city =>
      axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`)
    )
  );
  return results.map(result => result.data);
}