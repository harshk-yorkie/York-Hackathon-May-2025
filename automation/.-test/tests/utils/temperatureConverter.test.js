import { celsiusToFahrenheit, fahrenheitToCelsius } from '../src/utils/temperatureConverter';

describe('temperatureConverter', () => {
  test('celsiusToFahrenheit converts correctly', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  test('fahrenheitToCelsius converts correctly', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  test('handles edge cases', () => {
    expect(celsiusToFahrenheit(-273.15)).toBeCloseTo(-459.67, 2);
    expect(fahrenheitToCelsius(-459.67)).toBeCloseTo(-273.15, 2);
  });
});