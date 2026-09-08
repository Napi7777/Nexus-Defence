import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { extractSessionIdFromLink, JoinSessionByLinkCard } from '@/screens/sessions/components/JoinSessionByLinkCard';

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn().mockResolvedValue('https://nexus-learning.app/session/bio-lab-301'),
}));

describe('JoinSessionByLinkCard & extractSessionIdFromLink', () => {
  describe('extractSessionIdFromLink', () => {
    it('extracts ID from full HTTPS web link', () => {
      expect(extractSessionIdFromLink('https://nexus-learning.app/session/calc-room-101')).toBe('calc-room-101');
    });

    it('extracts ID from custom deep link scheme', () => {
      expect(extractSessionIdFromLink('nexus://session/quantum-physics-99')).toBe('quantum-physics-99');
    });

    it('extracts ID from URL with query parameters or fragments', () => {
      expect(extractSessionIdFromLink('https://nexus-learning.app/session/math-review?ref=invite#lobby')).toBe('math-review');
    });

    it('handles query parameter ID formats (?sessionId=...)', () => {
      expect(extractSessionIdFromLink('https://nexus-learning.app/join?sessionId=cs-algo-404')).toBe('cs-algo-404');
    });

    it('handles raw session / meeting IDs directly', () => {
      expect(extractSessionIdFromLink('session-quantum-101')).toBe('session-quantum-101');
      expect(extractSessionIdFromLink('  room-12345  ')).toBe('room-12345');
    });

    it('returns empty string for empty input', () => {
      expect(extractSessionIdFromLink('')).toBe('');
    });
  });

  describe('JoinSessionByLinkCard component', () => {
    it('renders input field, paste button, and join button', () => {
      const { getByText, getByPlaceholderText } = render(
        <JoinSessionByLinkCard onJoin={jest.fn()} />
      );

      expect(getByText('Join with Link or Meeting ID')).toBeTruthy();
      expect(getByPlaceholderText('Paste session link or Meeting ID...')).toBeTruthy();
      expect(getByText('Paste')).toBeTruthy();
      expect(getByText('Join Session')).toBeTruthy();
    });

    it('pastes link from clipboard when Paste is tapped', async () => {
      const { getByText, getByDisplayValue } = render(
        <JoinSessionByLinkCard onJoin={jest.fn()} />
      );

      const pasteBtn = getByText('Paste');
      fireEvent.press(pasteBtn);

      await waitFor(() => {
        expect(Clipboard.getStringAsync).toHaveBeenCalled();
        expect(getByDisplayValue('https://nexus-learning.app/session/bio-lab-301')).toBeTruthy();
      });
    });

    it('calls onJoin with extracted ID when user taps Join Session', async () => {
      const mockJoin = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <JoinSessionByLinkCard onJoin={mockJoin} />
      );

      const input = getByPlaceholderText('Paste session link or Meeting ID...');
      fireEvent.changeText(input, 'https://nexus-learning.app/session/physics-mechanics-202');

      const joinBtn = getByText('Join Session');
      fireEvent.press(joinBtn);

      expect(mockJoin).toHaveBeenCalledWith('physics-mechanics-202');
    });
  });
});
