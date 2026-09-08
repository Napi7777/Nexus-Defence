import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { InviteSessionModal } from '@/screens/sessions/components/InviteSessionModal';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

describe('InviteSessionModal — In-Progress Session Link Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockImplementation(jest.fn().mockResolvedValue({ action: 'sharedAction' }));
  });

  it('renders session invite information, web URL, and meeting ID', () => {
    const { getByText } = render(
      <InviteSessionModal
        visible={true}
        onClose={jest.fn()}
        sessionId="session-quantum-101"
        sessionTitle="Quantum Physics Workshop"
        hostName="Dr. Feynman"
      />
    );

    expect(getByText('Invite to Live Session')).toBeTruthy();
    expect(getByText('Quantum Physics Workshop')).toBeTruthy();
    expect(getByText('Dr. Feynman')).toBeTruthy();
    expect(getByText('https://nexus-learning.app/session/session-quantum-101')).toBeTruthy();
    expect(getByText('session-quantum-101')).toBeTruthy();
  });

  it('copies the invite link to the clipboard when Copy is tapped', async () => {
    const { getAllByText } = render(
      <InviteSessionModal
        visible={true}
        onClose={jest.fn()}
        sessionId="test-session-456"
      />
    );

    const copyButtons = getAllByText('Copy');
    fireEvent.press(copyButtons[0]);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        'https://nexus-learning.app/session/test-session-456'
      );
    });
  });

  it('copies the meeting ID to the clipboard when Copy ID is tapped', async () => {
    const { getAllByText } = render(
      <InviteSessionModal
        visible={true}
        onClose={jest.fn()}
        sessionId="meeting-abc-123"
      />
    );

    const copyButtons = getAllByText('Copy');
    fireEvent.press(copyButtons[1]);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('meeting-abc-123');
    });
  });

  it('triggers the native system share dialog with link and metadata', async () => {
    const { getByText } = render(
      <InviteSessionModal
        visible={true}
        onClose={jest.fn()}
        sessionId="calc-room-99"
        sessionTitle="Calculus Review"
        hostName="Sarah Connor"
      />
    );

    const shareBtn = getByText('Share Invite Link...');
    fireEvent.press(shareBtn);

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Join Calculus Review on Nexus',
        url: 'https://nexus-learning.app/session/calc-room-99',
        message: expect.stringContaining('https://nexus-learning.app/session/calc-room-99'),
      })
    );
  });
});
