import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WeatherApp from '../src/WeatherApp';
import axios from 'axios';

jest.mock('axios');

const mockWeatherData = [
  { city: 'New York', temperature: 20, condition: 'Sunny' },
  { city: 'Los Angeles', temperature: 25, condition: 'Cloudy' }
];

describe('WeatherApp Integration', () => {
  test('renders weather data from API', async () => {
    axios.get.mockResolvedValue({ data: mockWeatherData });
    render(<WeatherApp />);

    await waitFor(() => {
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));
    render(<WeatherApp />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load weather data')).toBeInTheDocument();
    });
  });
});