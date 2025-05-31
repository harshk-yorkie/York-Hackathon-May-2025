import { formatTemperature } from '../utils/weatherUtils';

test('formats temperature correctly', () => {
  expect(formatTemperature(23.456)).toBe('23.5°C');
});

test('throws error for invalid temperature', () => {
  expect(() => formatTemperature('invalid')).toThrow('Invalid temperature value');
});