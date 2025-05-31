import React from 'react';
import { render } from '@testing-library/react';
import ErrorBoundary from '../src/components/ErrorBoundary';

const ProblematicComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary Component', () => {
  test('catches errors and displays fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );
    expect(getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});