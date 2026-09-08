import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback';
import { HeaderBar, LabelledInput, PrimaryButton, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { styles } from '@/styles/appStyles';

export function CreateCommunityScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { addCommunity } = useAppStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !description.trim()) return;
    addCommunity(name.trim(), subject.trim(), description.trim());
    toast.show(`${name.trim()} created`);
    onCreated();
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Create Community" onBack={onBack} />
        <Text style={styles.sectionHeadline}>Start a Learning Group</Text>
        <Text style={styles.sectionSubline}>Create a dedicated space for peer collaboration.</Text>

        <LabelledInput label="Community Name" value={name} onChangeText={setName} placeholder="e.g. KNUST Computer Science 2026" />
        <LabelledInput label="Subject / Field" value={subject} onChangeText={setSubject} placeholder="e.g. Computer Science" />
        <LabelledInput label="Description" value={description} onChangeText={setDescription} placeholder="What will this group focus on?" multiline />

        <PrimaryButton label="Create & Broadcast (+100 Pts)" onPress={handleCreate} />
      </ScrollView>
    </SafeAreaView>
  );
}
