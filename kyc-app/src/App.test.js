import { render, screen } from '@testing-library/react';
import App from './App';

test('renders intelligent kyc heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /intelligent kyc experience/i })).toBeInTheDocument();
  expect(screen.getByText(/capture a clear document image/i)).toBeInTheDocument();
});
