import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import axios from 'axios';

jest.mock('axios');

describe('Weather Integration', () => {
  test('displays weather data for multiple cities', async () => {
    const data = {
      data: [
        { name: 'New York', temperature: 20, condition: 'Sunny' },
        { name: 'Los Angeles', temperature: 25, condition: 'Cloudy' }
      ]
    };
    axios.get.mockResolvedValue(data);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load weather data')).toBeInTheDocument();
    });
  });
});