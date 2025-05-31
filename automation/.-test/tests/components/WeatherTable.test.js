import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WeatherTable from '../src/components/WeatherTable';
import '@testing-library/jest-dom';

describe('WeatherTable Component', () => {
  test('renders without crashing', () => {
    render(<WeatherTable cities={[]} />);
    expect(screen.getByText(/Weather Comparison/i)).toBeInTheDocument();
  });

  test('displays city names correctly', () => {
    const cities = ['New York', 'Los Angeles'];
    render(<WeatherTable cities={cities} />);
    cities.forEach(city => {
      expect(screen.getByText(city)).toBeInTheDocument();
    });
  });

  test('handles empty city list', () => {
    render(<WeatherTable cities={[]} />);
    expect(screen.getByText(/No cities available/i)).toBeInTheDocument();
  });

  test('handles city selection', () => {
    const cities = ['New York', 'Los Angeles'];
    render(<WeatherTable cities={cities} />);
    fireEvent.click(screen.getByText('New York'));
    expect(screen.getByTestId('selected-city')).toHaveTextContent('New York');
  });
});