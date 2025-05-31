import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WeatherTable from '../src/components/WeatherTable';
import { fetchWeatherData } from '../src/services/weatherService';

jest.mock('../src/services/weatherService');

describe('WeatherTable Integration', () => {
  test('fetches and displays weather data for cities', async () => {
    fetchWeatherData.mockResolvedValueOnce({ weather: 'sunny', temperature: 25 });
    render(<WeatherTable cities={['New York']} />);
    await waitFor(() => expect(screen.getByText(/sunny/i)).toBeInTheDocument());
    expect(screen.getByText(/25°C/i)).toBeInTheDocument();
  });

  test('displays error message on API failure', async () => {
    fetchWeatherData.mockRejectedValueOnce(new Error('API Error'));
    render(<WeatherTable cities={['New York']} />);
    await waitFor(() => expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument());
  });
});