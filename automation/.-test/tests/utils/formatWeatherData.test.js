import { formatWeatherData } from '../src/utils/formatWeatherData';

describe('formatWeatherData Utility', () => {
  test('formats weather data correctly', () => {
    const rawData = { temperature: 20, condition: 'Sunny' };
    const formattedData = formatWeatherData(rawData);
    expect(formattedData).toEqual('20°C and Sunny');
  });

  test('handles missing data gracefully', () => {
    const rawData = {};
    const formattedData = formatWeatherData(rawData);
    expect(formattedData).toEqual('Data unavailable');
  });
});