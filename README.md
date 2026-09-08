# NEXUS Learning Commons Mobile Application

A state-of-the-art, cross-platform mobile application built with **Expo (React Native)**, **TypeScript**, and **Supabase Backend Services**. Designed for peer learning, live tutoring sessions, recorded lecture streaming, campus meetups, gamified study streak tracking, and real-time student collaboration.

---

## 🚀 Key Features & Modules

### 1. 🎥 Interactive Live Session Lobby
- **Real-Time Video Preview Box**: Local camera stream toggle and mic mute control.
- **Student Interactivity**: Hand Raise indicator button and live 25-person attendee modal list (`LobbyAttendeesModal`).
- **One-Tap Join**: Instant connection to peer learning streams.

### 2. ▶️ Recorded Video Lecture Player
- **Interactive Player Overlay**: Fullscreen stream modal with play/pause controls, progress scrubber bar, dynamic view counts, and duration badges.
- **Playback Speed Selector**: Custom speed options (`1.0x`, `1.25x`, `1.5x`, `2.0x`).
- **Chapter Bookmarks**: Clickable time stamps (e.g. `02:15 Intro`, `08:40 Worked Examples`).

### 3. 💬 Realtime Supabase Chat & Messaging
- **WebSocket Synchronization**: Powered by `supabase.channel()` (`subscribeToThreadMessages`).
- **Auto-Scrolling Chat Feed**: Instant message delivery, timestamping, sender avatars, and unread notification badges.

### 4. 🎁 Gamification Engine & Campus Perk Store
- **Level Rank Tiering**: Dynamic level progression bar (`Level 1` through `Level 5`).
- **Campus Perk Store**: Redeemable rewards (e.g., *Free Library Coffee Voucher*, *Priority Peer Tutoring Pass*).
- **Claim Code Generator**: Instant voucher code generation (e.g., `NEXUS-COFFEE-8492`).

### 5. 📍 Campus Study Meetup Map & RSVP
- **Venue Map Grid Preview Box**: Visual campus map location pin previews with walking distance indicators (`🚶 3 min walk`).
- **RSVP Confirmation Modal**: One-tap RSVP toggles with instant attendance counter updates and +50 XP rewards.

### 6. ⭐ Peer Tutor Skill Endorsements & Reviews
- **Skill Endorsements**: Interactive `+1 Endorse` button incrementing peer endorsements in real time.
- **Verified Tutor Badges**: `Verified Peer Tutor ✔` badge on qualified profiles.
- **Student Star Review Modal**: 5-star rating submission modal calculating average ratings and student feedback notes.

### 7. 🎨 Dark Mode & Theme Switcher
- **Theme Modes**: Seamless switching between **Light ☀️**, **Dark 🌙**, and **Midnight 🌌** (OLED deep navy) palettes.
- **System Theme Sync**: Auto-detects device dark mode settings.

### 8. 🔍 Global Instant Search & Discovery Modal
- **Multi-Entity Search Engine**: Unified query search across Communities, Live Sessions, Recorded Lectures, Meetups, and Peer Tutors.
- **Category Filter Pills**: Interactive pills (`All`, `Communities`, `Sessions`, `Lectures`, `Meetups`, `Tutors`).
- **One-Tap Navigation**: Selecting any search result routes directly to that screen.

### 9. 📄 Study Material PDF & Resource Attachment Drawer
- **Downloadable Course Files**: Formula sheets, lecture slides, cheat sheets, and solved exams.
- **Download Progress & XP Rewards**: Interactive file download state tracking (`✓ Downloaded`) awarding +20 XP.
- **Resource Uploader**: `+ Attach Course PDF` action for student note sharing.

### 10. 🔔 Notification Center & Live Activity Alerts Drawer
- **Activity Alert Feeds**: Notifications for live session broadcasts, meetup RSVPs, chat mentions, and XP awards.
- **Unread Counter Badge**: Header notification bell displaying live unread counter (`🔴 3`) with a "Mark All Read" action.
- **Direct Navigation**: Tapping a notification routes directly to the related content screen.

### 11. 🔥 Study Streak Calendar & Daily Goals Tracker
- **7-Day Streak Calendar**: Visual flame indicators (`🔥 5-Day Active Streak`) for Monday through Sunday.
- **Study Time Progress Wheel**: Logged study hours indicator (`2.5 / 3.0 Hours`) with `+ Log 30 Min Study (+15 XP)`.
- **Interactive Daily Checklist**: Check off daily goals in real time to earn XP points.

### 12. 📲 Push Notifications & Expo Device Push Token Handler
- **Device Push Token Service**: Created `src/lib/notifications.ts` utilizing `expo-notifications`.
- **Android High-Importance Channel**: Pre-configured vibration patterns and brand accent lights (`#2C2FA3`).
- **Local Push Alerts**: Immediate and scheduled device notifications.

### 13. 📦 EAS Build & Mobile App Store Packaging Setup
- **`eas.json` Profiles**: Configured for `development`, `preview` (APK generator), and `production` builds.
- **App Identifiers**: Bundle IDs set to `com.nexus.learningcommons.mobile` for iOS App Store and Google Play Store.

---

## 🛠️ Project Structure

Every module is grouped by the feature it serves. Screens live one-per-file
under `src/screens/<feature>/`, each folder exposing its screens through an
`index.ts` barrel, so `import { HomeScreen } from '@/screens/home'` is all a
caller ever needs to know.

Imports use the `@/*` path alias for `src/*` (configured in `tsconfig.json`, and
resolved natively by Expo's Metro bundler), so no file reaches back through
`../../..` to find a sibling module.

```text
NEXUS-mobile-main/
├── App.tsx                          # Root shell: providers, theme, route switch
├── app.json                         # Expo application manifest
├── eas.json                         # EAS build profiles (development, preview, production)
├── package.json                     # Dependencies & build scripts
├── supabase_schema.sql              # Supabase SQL database migration script
├── src/
│   ├── components/                  # Presentational components, shared across features
│   │   ├── ui/                      # Design-system primitives (Button, Avatar, Pill, Input…)
│   │   ├── feedback/                # Toast, skeletons, empty states, ErrorBoundary
│   │   ├── media/                   # AppImage, ParticipantVideo
│   │   └── overlays/                # Global search, notification centre, report sheet
│   ├── navigation/                  # Route stack hook, tab bar, app shell, transitions
│   ├── screens/                     # One folder per feature, one file per screen
│   │   ├── auth/                    # Splash, onboarding, welcome, sign-up, sign-in
│   │   ├── home/                    # Dashboard, 7-day streak & daily goals
│   │   ├── chat/                    # Thread list & realtime private chat
│   │   ├── communities/             # Community list, detail, creation
│   │   ├── sessions/                # Sessions list, scheduling, live lobby, meetups
│   │   │   └── components/          # Lobby-only pieces (control bar, roster, chat drawer)
│   │   ├── profile/                 # Profile, editing, password, notification prefs
│   │   ├── moderation/              # Report queue & community member management
│   │   ├── leaderboard/             # Points leaderboard
│   │   ├── recordings/              # Recorded lecture browser & player
│   │   └── filters/                 # Tutor discovery filters
│   ├── context/
│   │   └── AppStoreContext.tsx      # React context store & hooks
│   ├── data/
│   │   └── mockData.ts              # Data contracts, types & seed data
│   ├── lib/                         # Non-visual services
│   │   ├── supabase/                # Backend calls, split by domain (auth, chat, posts…)
│   │   ├── video/                   # LiveKit / local-preview video providers
│   │   ├── notifications.ts         # Expo push notification helper
│   │   ├── uploads.ts               # Storage uploads & signed URLs
│   │   ├── storage.ts               # AsyncStorage persistence
│   │   ├── recommendations.ts       # Session recommendation ranking
│   │   ├── session.ts               # Launch route resolution
│   │   └── haptics.ts               # Haptic feedback helpers
│   ├── styles/
│   │   ├── tokens.ts                # Design tokens: type, spacing, radii, shadows
│   │   ├── theme.ts                 # Theme colours (light / dark / midnight)
│   │   ├── appStyles.ts             # Composes the sheets into the themed stylesheet
│   │   └── sheets/                  # Style rules, split by the feature that uses them
│   └── __tests__/                   # Jest unit & component tests
```

---

## 💻 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Expo Development Server
```bash
npm start
```
*Or host on local area network for physical mobile devices:*
```bash
npx expo start --host lan
```

### 3. Connect a Mobile Device or Simulator
- Scan the printed terminal **QR Code** using the **Expo Go** app on iOS or Android.
- Press `a` for Android Emulator.
- Press `w` for Web Browser.

---

## 🗄️ Supabase Backend Setup

1. Copy `.env.example` to `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
2. Execute `supabase_learning_commons_schema.sql` in your Supabase SQL Editor to provision tables:
   - `profiles`, `communities`, `sessions`, `meetups`, `threads`, `messages`, `study_resources`, `perks`, `reviews`.

---

## 📦 EAS Build Commands

Generate native build artifacts for distribution:

```bash
# Build preview Android APK for direct hardware installation
npm run build:apk

# Build production Android App Bundle (.aab) for Google Play Store
npm run build:android

# Build production iOS App Package (.ipa) for Apple App Store
npm run build:ios

# Build both iOS and Android simultaneously
npm run build:all
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
