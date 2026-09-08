import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, SkeletonList } from '@/components/feedback';
import { Avatar, Pill, PrimaryButton, Text } from '@/components/ui';
import { FilterKey, useAppStore } from '@/context/AppStoreContext';
import { filterSections, UserProfile } from '@/data/mockData';
import { searchTutors } from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';

function toTitleCase(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

export function FiltersScreen({
  onBack,
  onApply,
}: {
  onBack: () => void;
  onApply: () => void;
}) {
  const colors = useThemeColors();
  const { selectedFilters, toggleFilter, resetFilters } = useAppStore();

  // SRS 3.11: Skill level and Availability are required search filters, but
  // until now they only ever narrowed the Sessions list — a tutor could match
  // every chip and never surface anywhere. searchTutors() already implements
  // this against the real profiles table; this screen is the one place both
  // filter sections are visible together, so it runs the search live as chips
  // are toggled and shows who actually matches.
  const [matchingTutors, setMatchingTutors] = useState<UserProfile[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(false);
  const hasTutorFilters = selectedFilters.skillLevel.length > 0 || selectedFilters.availability.length > 0;

  useEffect(() => {
    if (!hasTutorFilters) {
      setMatchingTutors([]);
      setTutorsLoading(false);
      return;
    }
    let active = true;
    setTutorsLoading(true);
    searchTutors({
      subjects: selectedFilters.subject,
      skillLevels: selectedFilters.skillLevel,
      availability: selectedFilters.availability,
    })
      .then((tutors) => {
        if (active) setMatchingTutors(tutors);
      })
      .finally(() => {
        if (active) setTutorsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTutorFilters, selectedFilters.subject.join(','), selectedFilters.skillLevel.join(','), selectedFilters.availability.join(',')]);

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <View style={styles.screenHeaderRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.screenTitle}>Filters</Text>
          <Pressable onPress={resetFilters}>
            <Text style={styles.helperLink}>Reset</Text>
          </Pressable>
        </View>

        {(Object.keys(filterSections) as FilterKey[]).map((section) => (
          <View key={section} style={styles.filterSection}>
            <Text style={styles.filterTitle}>{toTitleCase(section)}</Text>
            <View style={styles.filterWrap}>
              {filterSections[section].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => toggleFilter(section, option)}
                  style={[
                    styles.filterChip,
                    selectedFilters[section].includes(option) ? styles.filterChipActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilters[section].includes(option) ? styles.filterChipTextActive : undefined,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {hasTutorFilters ? (
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Matching Tutors</Text>
            {tutorsLoading ? (
              <SkeletonList count={3} lines={2} />
            ) : matchingTutors.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No tutors match yet"
                message="Try a different skill level or availability combination."
                compact
              />
            ) : (
              matchingTutors.map((tutor) => (
                <View
                  key={tutor.id}
                  style={[styles.threadRow, { backgroundColor: colors.card, padding: 14, borderRadius: 16, marginBottom: 8 }]}
                >
                  <Avatar source={tutor.avatar} size={40} />
                  <View style={styles.flexFill}>
                    <Text style={styles.threadName}>{tutor.name}</Text>
                    <Text style={styles.mutedCopySmall} numberOfLines={1}>
                      {tutor.skillLevel} · {tutor.skills.slice(0, 2).join(', ') || 'No skills listed'}
                    </Text>
                  </View>
                  <Pill label={`★ ${tutor.rating}`} tint="#E6F4EA" textColor="#137333" />
                </View>
              ))
            )}
          </View>
        ) : null}

        <PrimaryButton label="Apply Filters" onPress={onApply} />
      </ScrollView>
    </SafeAreaView>
  );
}
