import { formatTemperature } from '../src/utils/formatTemperature';

describe('formatTemperature Utility', () => {
  test('formats temperature correctly with unit', () => {
    expect(formatTemperature(25)).toBe('25°C');
  });

  test('handles negative temperatures', () => {
    expect(formatTemperature(-5)).toBe('-5°C');
  });

  test('handles zero temperature', () => {
    expect(formatTemperature(0)).toBe('0°C');
  });
});