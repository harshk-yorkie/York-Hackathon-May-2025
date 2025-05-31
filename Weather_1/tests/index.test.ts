import { fetchWeatherData } from '../src/api';
import { compareCities, sortData } from '../src/utils';

describe('Weather Comparison', () => {
  test('fetches weather data for multiple cities', async () => {
    const cities = ['London', 'Paris', 'New York'];
    const data = await fetchWeatherData(cities);
    expect(data.length).toBe(3);
  });

  test('sorts weather data', () => {
    const data = [{ city: 'A', temp: 10 }, { city: 'B', temp: 20 }, { city: 'C', temp: 15 }];
    const sortedData = sortData(data);
    expect(sortedData[0].city).toBe('B');
  });

  test('compares cities', () => {
    const data = [{ city: 'A', temp: 10 }, { city: 'B', temp: 20 }, { city: 'C', temp: 15 }];
    const comparison = compareCities(data);
    expect(comparison).toBeDefined();
  });
});