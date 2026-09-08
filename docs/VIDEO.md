# Live video integration (SRS 3.5)

## Where things stand

`LiveKitProvider` is the active provider (see `getVideoProvider()` in
[`src/lib/video/index.ts`](../src/lib/video/index.ts)) — it carries real audio,
video and screen-share between devices over LiveKit. It only works from a
development or production build, though: LiveKit is native code and cannot run
in Expo Go, so `getVideoProvider()` falls back to `LocalPreviewProvider`
whenever constructing `LiveKitProvider` throws (that's the normal case in Expo
Go, not an error to fix).

`LocalPreviewProvider` manages exactly one participant (you), shows your own
camera, and carries no audio, video, or screen share between devices. It
reports `supportsRemoteMedia: false` and `supportsScreenShare: false`, and the
session lobby keys its "Camera preview only" label and its Share tab's empty
state off those flags, rather than ever implying a call or a presentation is
live when nothing is actually being transmitted.

Everything the lobby needs goes through `VideoProvider` in
[`src/lib/video/types.ts`](../src/lib/video/types.ts). The screen imports no SDK,
so swapping providers touches one file.

## Integrating a real provider

1. Install the SDK and its Expo config plugin.
2. Implement `VideoProvider` in `src/lib/video/<name>Provider.ts`.
3. Change one line in [`src/lib/video/index.ts`](../src/lib/video/index.ts):

   ```ts
   const activeProvider: VideoProvider = new LiveKitProvider();
   ```

4. Render remote tracks. `VideoParticipant.track` is deliberately `unknown` —
   cast it to the SDK's track type inside a provider-specific view component and
   use that in the lobby's participant grid.
5. Rebuild the development build. **Every option below needs native code, so
   none of them run in Expo Go.**

`useVideoRoom` records attendance on join, so progress tracking (SRS 3.9) keeps
working regardless of which provider is active.

## Choosing a provider

| | Expo support | Free tier | Notes |
|---|---|---|---|
| **LiveKit** | Official config plugin | Generous cloud tier; self-hostable | Open source. Best Expo story of the three. |
| **Agora** | Community plugin | 10,000 min/month | Mature, widely used; minute-based pricing after that. |
| **Zoom Video SDK** | No official plugin | 10,000 min/month | Named in the SRS. Heaviest native setup on Expo. |

The SRS names Zoom as an example ("e.g. Zoom SDK") and the PRD explicitly allows
alternatives evaluated on cost and mobile SDK quality — so picking another
provider is within scope. Record the decision and the reasoning in the report.

## What a provider must handle

- **Token minting happens server-side.** Never ship an API secret in the app;
  add a Supabase Edge Function that issues a room token for the signed-in user.
- **Permissions.** Camera and microphone are already declared in `app.json`.
- **Reconnection.** Emit `reconnecting` and then `connected` or `failed`; the
  lobby surfaces `status` and `error` directly.
- **Cleanup.** `leave()` must release the camera, or the next join opens a black
  tile.

## Screen sharing

`setScreenShareEnabled(enabled)` on the provider, and `isScreenSharing` /
`screenShareTrack` on each `VideoParticipant`, are what the lobby's Share tab
uses — it draws whoever currently has `isScreenSharing: true`, and shows a
plain "No one is sharing their screen" state when nobody does. It never
fabricates presentation content, so a provider that reports sharing when
nothing is actually being published would put that bug straight back.

`LiveKitProvider` implements this with `room.localParticipant.setScreenShareEnabled()`,
the same call LiveKit's web SDK uses under `getDisplayMedia()`. On a native
build this is expected to prompt the
platform's screen-broadcast picker (ReplayKit on iOS, MediaProjection on
Android) — depending on the installed `@livekit/react-native` version, iOS may
additionally need a Broadcast Upload Extension target configured in the native
project before the OS will offer that picker at all. That native configuration
is outside what this repo's app-layer code controls; if `setScreenShareEnabled`
rejects on a real device, check the extension/config plugin setup for the
installed LiveKit RN SDK version before assuming the app code is at fault.
