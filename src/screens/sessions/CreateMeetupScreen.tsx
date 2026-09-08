import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar, LabelledInput, PrimaryButton, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { styles } from '@/styles/appStyles';

import { DateTimeField } from './components/DateTimeField';
import { KNUST_CAMPUS_VENUES } from './components/KNUSTMapModal';

/** Meetups default an hour out, matching ScheduleSessionScreen's default. */
function defaultMeetupTime(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Lets any signed-in peer tutor call an in-person campus meetup. Venues come
 * from the same KNUST_CAMPUS_VENUES list the campus map uses, so every
 * meetup created here resolves to an accurate pin and walking directions
 * instead of relying on fuzzy text matching.
 */
export function CreateMeetupScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { addMeetup } = useAppStore();
  const [title, setTitle] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(KNUST_CAMPUS_VENUES[0]);
  const [location, setLocation] = useState(KNUST_CAMPUS_VENUES[0].location);
  const [scheduledAt, setScheduledAt] = useState<Date>(defaultMeetupTime);

  const handleSelectVenue = (venue: (typeof KNUST_CAMPUS_VENUES)[number]) => {
    setSelectedVenue(venue);
    setLocation(venue.location);
  };

  const handleCreate = () => {
    if (!title.trim() || !location.trim()) return;
    const display = scheduledAt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + ' · ' + scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    addMeetup(title.trim(), location.trim(), display, scheduledAt.toISOString(), {
      latitude: selectedVenue.latitude,
      longitude: selectedVenue.longitude,
      mapCoordX: selectedVenue.mapCoordX,
      mapCoordY: selectedVenue.mapCoordY,
      landmark: selectedVenue.name,
      walkingDistance: selectedVenue.walkingDistance,
      directions: selectedVenue.directions,
    });
    onCreated();
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Schedule Campus Meetup" onBack={onBack} />
        <Text style={styles.sectionHeadline}>In-Person Peer Session</Text>
        <Text style={styles.sectionSubline}>Call peers together for a face-to-face study group or tutoring session on campus.</Text>

        <LabelledInput label="Meetup Title" value={title} onChangeText={setTitle} placeholder="e.g. KNUST Math Study Circle" />

        <Text style={styles.inputLabel}>Campus Venue</Text>
        <View style={styles.hotspotWrap}>
          {KNUST_CAMPUS_VENUES.map((venue) => (
            <Pressable
              key={venue.name}
              onPress={() => handleSelectVenue(venue)}
              style={[styles.hotspotChip, selectedVenue.name === venue.name ? styles.hotspotChipActive : undefined]}
            >
              <Text
                style={[
                  styles.hotspotChipText,
                  selectedVenue.name === venue.name ? styles.hotspotChipTextActive : undefined,
                ]}
              >
                {venue.tag}
              </Text>
            </Pressable>
          ))}
        </View>

        <LabelledInput label="Exact Location Details" value={location} onChangeText={setLocation} placeholder="e.g. Main Library 2nd Floor, Quiet Zone" />
        <DateTimeField label="Date & Time" value={scheduledAt} onChange={setScheduledAt} />

        <PrimaryButton label="Publish Campus Meetup (+75 Pts)" onPress={handleCreate} />
      </ScrollView>
    </SafeAreaView>
  );
}
