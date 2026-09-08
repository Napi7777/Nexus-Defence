import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { brand } from '@/data/mockData';
import { notifySuccess, tapMedium } from '@/lib/haptics';

export type PollOption = {
  id: string;
  text: string;
  votes: number;
  isCorrect?: boolean;
};

export type ClassPoll = {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  explanation?: string;
};

const DEFAULT_POLLS: ClassPoll[] = [];

export function ClassPollModal({
  visible,
  onClose,
  isHost = false,
  onAwardXP,
}: {
  visible: boolean;
  onClose: () => void;
  isHost?: boolean;
  onAwardXP?: (points: number) => void;
}) {
  const [activePolls, setActivePolls] = useState<ClassPoll[]>(DEFAULT_POLLS);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOpt1, setNewOpt1] = useState('');
  const [newOpt2, setNewOpt2] = useState('');
  const [newOpt3, setNewOpt3] = useState('');

  const handleVote = (pollId: string, optionId: string) => {
    if (selectedOptions[pollId]) return;
    tapMedium();
    notifySuccess();
    setSelectedOptions((prev) => ({ ...prev, [pollId]: optionId }));
    setActivePolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          return {
            ...poll,
            totalVotes: poll.totalVotes + 1,
            options: poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          };
        }
        return poll;
      })
    );
    onAwardXP?.(15);
  };

  const handleCreatePoll = () => {
    if (!newQuestion.trim() || !newOpt1.trim() || !newOpt2.trim()) return;
    const opts: PollOption[] = [
      { id: `opt-${Date.now()}-1`, text: newOpt1.trim(), votes: 0 },
      { id: `opt-${Date.now()}-2`, text: newOpt2.trim(), votes: 0 },
    ];
    if (newOpt3.trim()) {
      opts.push({ id: `opt-${Date.now()}-3`, text: newOpt3.trim(), votes: 0 });
    }

    const newPoll: ClassPoll = {
      id: `poll-${Date.now()}`,
      question: newQuestion.trim(),
      options: opts,
      totalVotes: 0,
    };

    setActivePolls((prev) => [newPoll, ...prev]);
    setNewQuestion('');
    setNewOpt1('');
    setNewOpt2('');
    setNewOpt3('');
    setShowCreatePoll(false);
    notifySuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.95)' }}>
        <View style={pollStyles.container}>
          {/* Header */}
          <View style={pollStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={pollStyles.iconBadge}>
                <Ionicons name="stats-chart" size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Live Classroom Polls</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Vote to test your mastery & earn +15 XP</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => setShowCreatePoll((prev) => !prev)}
                style={pollStyles.createTriggerBtn}
              >
                <Ionicons name={showCreatePoll ? 'close' : 'add'} size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  {showCreatePoll ? 'Cancel' : '+ Poll'}
                </Text>
              </Pressable>

              <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Create Poll Card */}
          {showCreatePoll && (
            <View style={pollStyles.createFormCard}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 8 }}>
                Create Quick Classroom Poll
              </Text>
              <TextInput
                placeholder="Enter multiple-choice question..."
                placeholderTextColor="#6B7280"
                value={newQuestion}
                onChangeText={setNewQuestion}
                style={pollStyles.input}
              />
              <TextInput
                placeholder="Option 1 (e.g. O(n log n))"
                placeholderTextColor="#6B7280"
                value={newOpt1}
                onChangeText={setNewOpt1}
                style={pollStyles.input}
              />
              <TextInput
                placeholder="Option 2 (e.g. O(n²))"
                placeholderTextColor="#6B7280"
                value={newOpt2}
                onChangeText={setNewOpt2}
                style={pollStyles.input}
              />
              <TextInput
                placeholder="Option 3 (Optional)"
                placeholderTextColor="#6B7280"
                value={newOpt3}
                onChangeText={setNewOpt3}
                style={pollStyles.input}
              />

              <Pressable
                onPress={handleCreatePoll}
                style={({ pressed }) => [
                  pollStyles.submitPollBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Broadcast Poll to Class
                </Text>
              </Pressable>
            </View>
          )}

          {/* Polls Feed */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {activePolls.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
                <Ionicons name="stats-chart-outline" size={44} color="#475569" />
                <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  No active classroom polls
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
                  Tap "+ Poll" above to broadcast a quick poll or comprehension question to the entire class.
                </Text>
              </View>
            ) : (
              activePolls.map((poll) => {
                const userChoice = selectedOptions[poll.id];
                const hasVoted = Boolean(userChoice);

                return (
                  <View key={poll.id} style={pollStyles.pollCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1 }}>
                        {poll.question}
                      </Text>
                      <View style={pollStyles.votesBadge}>
                        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700' }}>
                          {poll.totalVotes} votes
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 12, gap: 8 }}>
                      {poll.options.map((opt) => {
                        const isSelected = userChoice === opt.id;
                        const percentage = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;

                        return (
                          <Pressable
                            key={opt.id}
                            disabled={hasVoted}
                            onPress={() => handleVote(poll.id, opt.id)}
                            style={({ pressed }) => [
                              pollStyles.optionRow,
                              isSelected && pollStyles.optionRowSelected,
                              pressed && !hasVoted && { opacity: 0.8 },
                            ]}
                          >
                            {/* Vote percentage bar fill */}
                            {hasVoted && (
                              <View
                                style={[
                                  pollStyles.percentageFill,
                                  { width: `${percentage}%` },
                                  opt.isCorrect ? { backgroundColor: 'rgba(52, 211, 153, 0.25)' } : undefined,
                                ]}
                              />
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons
                                  name={
                                    isSelected
                                      ? 'checkmark-circle'
                                      : hasVoted
                                        ? 'radio-button-off'
                                        : 'radio-button-off-outline'
                                  }
                                  size={18}
                                  color={isSelected ? '#38BDF8' : '#64748B'}
                                />
                                <Text
                                  style={{
                                    color: isSelected ? '#FFFFFF' : '#E2E8F0',
                                    fontSize: 13,
                                    fontWeight: isSelected ? '700' : '500',
                                    flex: 1,
                                  }}
                                >
                                  {opt.text}
                                </Text>
                              </View>

                              {hasVoted && (
                                <Text style={{ color: opt.isCorrect ? '#34D399' : '#94A3B8', fontSize: 12, fontWeight: '800' }}>
                                  {percentage}% {opt.isCorrect ? '✓' : ''}
                                </Text>
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

                    {hasVoted && poll.explanation && (
                      <View style={pollStyles.explanationCard}>
                        <Ionicons name="information-circle" size={16} color="#38BDF8" />
                        <Text style={{ color: '#93C5FD', fontSize: 11, flex: 1, lineHeight: 16 }}>
                          {poll.explanation}
                        </Text>
                      </View>
                    )}
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

const pollStyles = StyleSheet.create({
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
  createTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createFormCard: {
    marginHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitPollBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  pollCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  votesBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  optionRow: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  optionRowSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  percentageFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
});
