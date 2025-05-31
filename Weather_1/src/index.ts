import express from 'express';
import { getWeatherData } from './api';

const app = express();
const port = process.env.PORT || 3000;

app.get('/weather', async (req, res) => {
  const cities = req.query.cities as string[];
  const data = await getWeatherData(cities);
  res.json(data);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});