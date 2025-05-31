import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/search', async (req, res) => {
  const { query } = req.query;

  try {
    const response = await axios.get(`http://api.openweathermap.org/data/2.5/find?q=${query}&appid=YOUR_OPEN_WEATHER_MAP_API_KEY`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

export default router;