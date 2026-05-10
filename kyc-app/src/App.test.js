import { render, screen } from '@testing-library/react';
import App from './App';

test('renders intelligent kyc capture options', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /intelligent kyc experience/i })).toBeInTheDocument();
  expect(screen.getByText(/capture a clear document image/i)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /document camera/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /existing document photo/i })).toBeInTheDocument();
  expect(screen.getByText(/upload an existing photo/i)).toBeInTheDocument();
});
