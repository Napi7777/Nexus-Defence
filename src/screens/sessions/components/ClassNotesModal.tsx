import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { notifySuccess, tapLight } from '@/lib/haptics';

export type LectureNoteItem = {
  id: string;
  author: string;
  time: string;
  text: string;
  isFormula?: boolean;
};

const INITIAL_NOTES: LectureNoteItem[] = [];

export function ClassNotesModal({
  visible,
  onClose,
  currentUserName = 'You',
}: {
  visible: boolean;
  onClose: () => void;
  currentUserName?: string;
}) {
  const [notes, setNotes] = useState<LectureNoteItem[]>(INITIAL_NOTES);
  const [draftNote, setDraftNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!draftNote.trim()) return;
    tapLight();
    notifySuccess();
    const newNote: LectureNoteItem = {
      id: `note-${Date.now()}`,
      author: currentUserName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: draftNote.trim(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setDraftNote('');
  };

  const handleCopyNote = (id: string) => {
    tapLight();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.95)' }}>
        <View style={notesStyles.container}>
          {/* Header */}
          <View style={notesStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={notesStyles.iconBadge}>
                <Ionicons name="journal" size={16} color="#FBBF24" />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  Lecture Scratchpad & Notes 📝
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                  Shared collaborative notes, formulas & key takeaways
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={notesStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Add Note Input Box */}
          <View style={notesStyles.inputCard}>
            <TextInput
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Jot down a formula, tip, or class takeaway..."
              placeholderTextColor="#64748B"
              multiline
              style={notesStyles.input}
            />
            <Pressable
              disabled={!draftNote.trim()}
              onPress={handleAddNote}
              style={({ pressed }) => [
                notesStyles.postBtn,
                !draftNote.trim() && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                Add to Class Notes
              </Text>
            </Pressable>
          </View>

          {/* Notes List */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {notes.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
                <Ionicons name="journal-outline" size={44} color="#475569" />
                <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  No shared notes yet
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
                  Jot down key points, takeaways, or formulas above to share with everyone in this session.
                </Text>
              </View>
            ) : (
              notes.map((note) => {
                const isCopied = copiedId === note.id;

                return (
                  <View key={note.id} style={notesStyles.noteCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                          {note.author}
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 11 }}>• {note.time}</Text>
                      </View>

                      <Pressable onPress={() => handleCopyNote(note.id)} style={notesStyles.copyBtn}>
                        <Ionicons
                          name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                          size={14}
                          color={isCopied ? '#34D399' : '#94A3B8'}
                        />
                        <Text style={{ color: isCopied ? '#34D399' : '#94A3B8', fontSize: 11, fontWeight: '700' }}>
                          {isCopied ? 'Copied' : 'Copy'}
                        </Text>
                      </Pressable>
                    </View>

                    <Text
                      style={[
                        notesStyles.noteText,
                        note.isFormula && notesStyles.formulaText,
                      ]}
                    >
                      {note.text}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const notesStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  inputCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  noteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noteText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  formulaText: {
    fontFamily: 'monospace',
    color: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    padding: 8,
    borderRadius: 6,
  },
});
