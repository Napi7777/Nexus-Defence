import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, SkeletonList } from '@/components/feedback';
import { Avatar, HeaderBar, Pill, PrimaryButton, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand } from '@/data/mockData';
import { getLeaderboard, LeaderboardRow } from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';

function getLevelTier(points: number) {
  if (points >= 1000) return { title: 'Level 5: Campus Legend', currentXp: points, nextXp: 1500, percent: 100 };
  if (points >= 750) return { title: 'Level 4: Scholar', currentXp: points, nextXp: 1000, percent: Math.min(100, Math.round(((points - 750) / 250) * 100)) };
  if (points >= 500) return { title: 'Level 3: Master Peer', currentXp: points, nextXp: 750, percent: Math.min(100, Math.round(((points - 500) / 250) * 100)) };
  if (points >= 250) return { title: 'Level 2: Study Mentor', currentXp: points, nextXp: 500, percent: Math.min(100, Math.round(((points - 250) / 250) * 100)) };
  return { title: 'Level 1: Academic Novice', currentXp: points, nextXp: 250, percent: Math.min(100, Math.round((points / 250) * 100)) };
}

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const { profile, updateProfile } = useAppStore();
  // Was rendering the mock `sampleLeaderboard` array; now reads the aggregated
  // leaderboard view built from the points ledger and attendance table.
  const [leaders, setLeaders] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getLeaderboard()
      .then((rows) => {
        if (active) setLeaders(rows);
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayLeaders = leaders.map((item) =>
    item.id === profile.id
      ? {
          ...item,
          points: Math.max(item.points, profile.points || 0),
          name: profile.name || item.name,
          avatar: profile.avatar || item.avatar,
        }
      : item
  );
  const [showPerkStore, setShowPerkStore] = useState(false);
  const [claimedVoucher, setClaimedVoucher] = useState<{ title: string; code: string } | null>(null);

  const levelInfo = getLevelTier(profile.points);

  const perkStoreItems = [
    { id: 'coffee', title: 'Campus Library Coffee Voucher', cost: 150, icon: 'cafe-outline', desc: '1 Free hot coffee at KNUST Main Library Cafe' },
    { id: 'priority', title: 'Priority Tutoring Pass', cost: 300, icon: 'star-outline', desc: 'Jump the queue for 1-on-1 peer tutoring sessions' },
    { id: 'featured', title: 'Featured Post Badge', cost: 450, icon: 'megaphone-outline', desc: 'Pin your study group post to the community top feed for 7 days' },
    { id: 'leader', title: 'Certified Peer Leader Badge', cost: 600, icon: 'medal-outline', desc: 'Unlock gold verified peer badge on your profile' },
  ];

  const handleRedeemPerk = (perk: typeof perkStoreItems[0]) => {
    if (profile.points < perk.cost) return;

    const voucherCode = `NEXUS-${perk.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Deduct points balance
    updateProfile({ points: Math.max(0, profile.points - perk.cost) });
    setClaimedVoucher({ title: perk.title, code: voucherCode });
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <HeaderBar title="Leaderboard & XP Rewards" onBack={onBack} />

        {/* User XP Rank & Level Progress Card */}
        <View style={styles.recommendedCard}>
          <Ionicons name="trophy" size={32} color="#E07038" />
          <View style={styles.flexFill}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.recommendedTitle}>{profile.name} (You)</Text>
              <View style={styles.levelBadgeChip}>
                <Text style={styles.levelBadgeText}>{levelInfo.title}</Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.levelProgressTrack}>
              <View style={[styles.levelProgressFill, { width: `${levelInfo.percent}%` }]} />
            </View>

            <Text style={styles.mutedCopySmall}>
              {profile.points} XP · {levelInfo.nextXp - profile.points} XP to next level tier
            </Text>
          </View>
        </View>

        {/* Perk Store Quick Banner */}
        <Pressable
          onPress={() => setShowPerkStore(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: brand.primary, padding: 16, borderRadius: 18 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="gift-outline" size={24} color="#fff" />
            <View>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Campus Perk Store</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Redeem points for coffee, passes & badges</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>

        <Text style={styles.sectionTitle}>Top Campus Tutors & Peers</Text>
        {leaderboardLoading ? (
          <SkeletonList count={4} lines={2} />
        ) : displayLeaders.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="No rankings yet"
            message="Attend a session or post in a community to put yourself on the board."
            compact
          />
        ) : (
          displayLeaders.map((item, index) => (
            <View
              key={item.id}
              style={[styles.threadRow, { backgroundColor: colors.card, padding: 14, borderRadius: 16, marginBottom: 8 }]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  width: 28,
                  color: index === 0 ? '#E07038' : colors.text,
                }}
              >
                #{index + 1}
              </Text>
              <Avatar source={item.avatar} size={40} />
              <View style={styles.flexFill}>
                <Text style={styles.threadName}>{item.name}</Text>
                <Text style={styles.mutedCopySmall}>
                  {item.sessions} session{item.sessions === 1 ? '' : 's'} · {item.university}
                </Text>
              </View>
              <Pill label={`${item.points} pts`} tint="#E6F4EA" textColor="#137333" />
            </View>
          ))
        )}
      </ScrollView>

      {/* Campus Perk Store Modal */}
      <Modal visible={showPerkStore} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Campus Perk Store</Text>
                <Text style={styles.mutedCopySmall}>Available Balance: {profile.points} XP Points</Text>
              </View>
              <Pressable onPress={() => { setShowPerkStore(false); setClaimedVoucher(null); }}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>

            {claimedVoucher ? (
              <View style={{ gap: 12, alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#137333' }}>Perk Claimed Successfully!</Text>
                <Text style={[styles.mutedCopy, { textAlign: 'center' }]}>{claimedVoucher.title}</Text>

                <View style={styles.voucherCodeBox}>
                  <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>YOUR VOUCHER CLAIM CODE</Text>
                  <Text style={styles.voucherCodeText}>{claimedVoucher.code}</Text>
                </View>

                <Text style={styles.mutedCopySmall}>Show this claim code at campus library or tutoring desk.</Text>
                <PrimaryButton label="Claim Another Perk" onPress={() => setClaimedVoucher(null)} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {perkStoreItems.map((perk) => {
                  const canAfford = profile.points >= perk.cost;
                  return (
                    <View key={perk.id} style={styles.perkCard}>
                      <View style={styles.perkIconWrap}>
                        <Ionicons name={perk.icon as any} size={22} color={brand.primary} />
                      </View>

                      <View style={styles.flexFill}>
                        <Text style={styles.communityName}>{perk.title}</Text>
                        <Text style={styles.mutedCopySmall}>{perk.desc}</Text>
                        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={styles.perkCostBadge}>
                            <Text style={styles.perkCostText}>{perk.cost} XP Points</Text>
                          </View>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleRedeemPerk(perk)}
                        style={{
                          backgroundColor: canAfford ? brand.primary : '#E2DFD7',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: canAfford ? '#fff' : colors.muted }}>
                          {canAfford ? 'Redeem' : 'Need XP'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <PrimaryButton label="Close Perk Store" onPress={() => { setShowPerkStore(false); setClaimedVoucher(null); }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
