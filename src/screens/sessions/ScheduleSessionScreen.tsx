import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar, LabelledInput, PrimaryButton } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { styles } from '@/styles/appStyles';

import { DateTimeField } from './components/DateTimeField';

/** A session must start at least 10 minutes out — never "right now", which is
 * what silently happened before this screen captured a real timestamp. */
function defaultSessionTime(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

export function ScheduleSessionScreen({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { addSession } = useAppStore();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(defaultSessionTime);
  const [description, setDescription] = useState('');

  const handleSchedule = () => {
    if (!title.trim()) return;
    const display = scheduledAt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + ' · ' + scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    addSession(title.trim(), tags.trim() || 'General', display, scheduledAt.toISOString());
    onSubmit();
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Schedule Session" onBack={onBack} />

        <LabelledInput label="Session Title" value={title} onChangeText={setTitle} placeholder="e.g. Calculus III Review" />
        <LabelledInput label="Subject / Tag" value={tags} onChangeText={setTags} placeholder="e.g. Mathematics" />
        <DateTimeField label="Date & Time" value={scheduledAt} onChange={setScheduledAt} />
        <LabelledInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What will this session cover?"
          multiline
        />

        <PrimaryButton label="Schedule & Broadcast (+100 Pts)" onPress={handleSchedule} />
      </ScrollView>
    </SafeAreaView>
  );
}
