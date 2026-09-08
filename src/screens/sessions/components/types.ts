/** One row of the live-session roster, as shown in the lobby. */
export type LobbyParticipant = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
};

/** A message sent in the in-meeting chat drawer. */
export type LobbyChatMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
};
