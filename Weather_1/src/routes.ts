import { Router } from 'express';
import WeatherService from './services/weatherService';

const router = Router();

router.get('/weather', async (req, res) => {
  const cities = req.query.cities as string[];
  const weatherData = await WeatherService.getWeatherData(cities);
  res.json(weatherData);
});

export default router;