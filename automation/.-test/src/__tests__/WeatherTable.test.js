import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeatherTable from '../components/WeatherTable';

jest.mock('../services/weatherService', () => ({
  fetchWeatherData: jest.fn((city) => {
    return Promise.resolve({
      city,
      temperature: 25,
      condition: 'Clear sky'
    });
  })
}));

describe('WeatherTable', () => {
  it('renders weather data for multiple cities', async () => {
    render(<WeatherTable cities={["London", "New York"]} />);

    expect(await screen.findByText('London')).toBeInTheDocument();
    expect(await screen.findByText('New York')).toBeInTheDocument();
    expect(await screen.findAllByText('25 °C')).toHaveLength(2);
    expect(await screen.findAllByText('Clear sky')).toHaveLength(2);
  });

  it('displays an error message on fetch failure', async () => {
    jest.mock('../services/weatherService', () => ({
      fetchWeatherData: jest.fn(() => {
        return Promise.reject(new Error('Failed to fetch'));
      })
    }));

    render(<WeatherTable cities={["InvalidCity"]} />);

    expect(await screen.findByText('Failed to fetch weather data.')).toBeInTheDocument();
  });
});