import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPrompt from './SignInPrompt';

// Mock the AuthContext so the test doesn't try to connect to Supabase
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithGoogleIdToken: vi.fn(),
  }),
}));

// Mock the One Tap hook so it doesn't try to load Google's script
vi.mock('../../hooks/useGoogleOneTap', () => ({
  useGoogleOneTap: () => ({
    available: false,
    promptOneTap: vi.fn(),
  }),
}));

describe('SignInPrompt Component', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <SignInPrompt open={false} reason="Test" onClose={vi.fn()} />
    );
    // Container should be empty
    expect(container.firstChild).toBeNull();
  });

  it('renders the reason text when open is true', () => {
    render(
      <SignInPrompt open={true} reason="Sign in to play" onClose={vi.fn()} />
    );
    // Should find the reason text on the screen
    expect(screen.getByText('Sign in to play')).toBeInTheDocument();
  });

  it('shows the Continue with Google button', () => {
    render(
      <SignInPrompt open={true} reason="Test" onClose={vi.fn()} />
    );
    // Look for the Google button
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });
});