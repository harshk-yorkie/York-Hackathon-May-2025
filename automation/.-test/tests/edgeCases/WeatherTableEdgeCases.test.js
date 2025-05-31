import React from 'react';
import { render, screen } from '@testing-library/react';
import WeatherTable from '../src/components/WeatherTable';

describe('WeatherTable Edge Cases', () => {
  test('renders with no cities', () => {
    render(<WeatherTable cities={[]} />);
    expect(screen.getByText(/No cities available/i)).toBeInTheDocument();
  });

  test('handles large number of cities', () => {
    const cities = Array.from({ length: 100 }, (_, i) => `City ${i}`);
    render(<WeatherTable cities={cities} />);
    expect(screen.getByText('City 99')).toBeInTheDocument();
  });
});