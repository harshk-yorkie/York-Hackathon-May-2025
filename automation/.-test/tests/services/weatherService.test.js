import { fetchWeatherData } from '../src/services/weatherService';
import axios from 'axios';

jest.mock('axios');

describe('weatherService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchWeatherData returns data for valid city', async () => {
    const mockData = { data: { weather: 'sunny', temperature: 25 } };
    axios.get.mockResolvedValue(mockData);
    const data = await fetchWeatherData('New York');
    expect(data).toEqual(mockData.data);
  });

  test('fetchWeatherData throws error for invalid city', async () => {
    axios.get.mockRejectedValue(new Error('City not found'));
    await expect(fetchWeatherData('InvalidCity')).rejects.toThrow('City not found');
  });
});