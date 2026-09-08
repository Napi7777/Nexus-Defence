import { Feather, Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { Pill, PrimaryButton, Text } from '@/components/ui';
import { InPersonMeetup } from '@/data/mockData';
import { useThemeColors } from '@/styles/appStyles';
import { brand } from '@/data/mockData';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';

const KNUST_MAP_ASSET = require('../../../../assets/knust_campus_map.jpg');

export const KNUST_CAMPUS_VENUES = [
  {
    name: 'Prempeh II Memorial Library',
    tag: 'Main Library',
    location: 'Prempeh II Library 2nd Floor, Quiet Zone',
    latitude: 6.6738,
    longitude: -1.5654,
    mapCoordX: 34,
    mapCoordY: 28,
    walkingDistance: '2 min walk from Admin Block',
    directions: [
      'Enter via KNUST Main Security Gate',
      'Follow Independence Hall Road past Admin Block',
      'Prempeh II Library is on your left with dome roof',
      'Proceed to 2nd Floor Quiet Zone (North Wing)',
    ],
  },
  {
    name: 'College of Engineering',
    tag: 'Engineering',
    location: 'College of Engineering Lab 3',
    latitude: 6.6765,
    longitude: -1.5685,
    mapCoordX: 57,
    mapCoordY: 25,
    walkingDistance: '4 min walk from Prempeh II Library',
    directions: [
      'Head north-east along Independence Hall Road',
      'Turn into the College of Engineering quadrangle',
      'Follow signage to Innovation Hub & Computer Lab 3',
    ],
  },
  {
    name: 'College of Science',
    tag: 'Science',
    location: 'College of Science Casely Hayford Hall',
    latitude: 6.6710,
    longitude: -1.5645,
    mapCoordX: 74,
    mapCoordY: 35,
    walkingDistance: '3 min walk from CCB',
    directions: [
      'Walk past Central Classroom Block (CCB)',
      'Cross Jubilee Hall Road towards College of Science',
      'Enter Casely Hayford Lecture Theatre Foyer',
    ],
  },
  {
    name: 'Central Classroom Block (CCB)',
    tag: 'CCB',
    location: 'CCB Ground Floor Collaboration Pods',
    latitude: 6.6730,
    longitude: -1.5670,
    mapCoordX: 59,
    mapCoordY: 50,
    walkingDistance: '1 min walk from CCB Road',
    directions: [
      'Located along CCB Road between Great Hall and Jubilee Hall',
      'Enter through the main front glass doors',
      'Ground Floor Study Pods are directly past the entrance hall',
    ],
  },
  {
    name: 'Great Hall Foyer',
    tag: 'Great Hall',
    location: 'Great Hall Foyer & Conference Room A',
    latitude: 6.6725,
    longitude: -1.5625,
    mapCoordX: 71,
    mapCoordY: 60,
    walkingDistance: '2 min walk from Republic Hall',
    directions: [
      'Head towards the central KNUST ceremonial square',
      'Great Hall main entrance staircase',
      'Foyer study lounge is open for peer discussions',
    ],
  },
  {
    name: 'Jubilee Mall Lounge',
    tag: 'Commercial Area',
    location: 'Jubilee Mall 1st Floor Study Café',
    latitude: 6.6750,
    longitude: -1.5630,
    mapCoordX: 33,
    mapCoordY: 55,
    walkingDistance: '1 min walk from Unity Hall',
    directions: [
      'Located along Jubilee Mall Road near Unity Hall',
      'Take escalator to 1st Floor Student Study Area',
    ],
  },
];

export function KNUSTMapModal({
  visible,
  meetup,
  allMeetups = [],
  onClose,
  onRSVP,
}: {
  visible: boolean;
  meetup: InPersonMeetup | null;
  allMeetups?: InPersonMeetup[];
  onClose: () => void;
  onRSVP?: (meetup: InPersonMeetup) => void;
}) {
  const colors = useThemeColors();
  const [activeMeetup, setActiveMeetup] = useState<InPersonMeetup | null>(meetup);
  const [showDirectionsList, setShowDirectionsList] = useState(false);
  const [activeTab, setActiveTab] = useState<'campus' | 'gps'>('campus');

  // Keep in sync when parent passes a new meetup
  const currentMeetup = activeMeetup || meetup;
  if (!currentMeetup) return null;

  // Resolve venue coordinates from meetup or matched venue list
  const matchedVenue = KNUST_CAMPUS_VENUES.find(
    (v) =>
      currentMeetup.location.toLowerCase().includes(v.tag.toLowerCase()) ||
      currentMeetup.location.toLowerCase().includes(v.name.toLowerCase()) ||
      currentMeetup.title.toLowerCase().includes(v.tag.toLowerCase())
  ) || KNUST_CAMPUS_VENUES[0];

  const pinX = currentMeetup.mapCoordX ?? matchedVenue.mapCoordX;
  const pinY = currentMeetup.mapCoordY ?? matchedVenue.mapCoordY;
  const lat = currentMeetup.latitude ?? matchedVenue.latitude;
  const lng = currentMeetup.longitude ?? matchedVenue.longitude;
  const walkingNote = currentMeetup.walkingDistance || matchedVenue.walkingDistance;
  const directionsSteps = currentMeetup.directions || matchedVenue.directions;

  const handleOpenLiveNavigation = async () => {
    tapMedium();
    const destinationQuery = `${lat},${lng}`;
    const destinationLabel = encodeURIComponent(`KNUST ${matchedVenue.name}`);
    const url = Platform.select({
      ios: `maps://?daddr=${destinationQuery}&q=${destinationLabel}&dirflg=w`,
      android: `google.navigation:q=${destinationQuery}&mode=w`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&destination_place_id=${destinationLabel}&travelmode=walking`,
    })!;

    try {
      const canOpen = await Linking.canOpenURL(url);
      await Linking.openURL(canOpen ? url : `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=walking`);
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destinationQuery}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Bar */}
          <View style={modalStyles.headerRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location" size={18} color={brand.primary} />
                <Text style={[modalStyles.title, { color: colors.text }]} numberOfLines={1}>
                  KNUST Campus Map
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                Kumasi, Ghana · {matchedVenue.name}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Ionicons name="close-circle" size={26} color={colors.muted} />
            </Pressable>
          </View>

          {/* Mode Switcher: Illustrated Campus Map vs Live Satellite/OSM */}
          <View style={modalStyles.modeSwitcher}>
            <Pressable
              onPress={() => {
                tapLight();
                setActiveTab('campus');
              }}
              style={[modalStyles.modeTab, activeTab === 'campus' && modalStyles.modeTabActive]}
            >
              <Ionicons name="map" size={13} color={activeTab === 'campus' ? '#fff' : colors.muted} />
              <Text style={[modalStyles.modeTabText, activeTab === 'campus' && modalStyles.modeTabTextActive]}>
                KNUST Campus Plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                setActiveTab('gps');
              }}
              style={[modalStyles.modeTab, activeTab === 'gps' && modalStyles.modeTabActive]}
            >
              <Ionicons name="navigate" size={13} color={activeTab === 'gps' ? '#fff' : colors.muted} />
              <Text style={[modalStyles.modeTabText, activeTab === 'gps' && modalStyles.modeTabTextActive]}>
                Google Maps
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Visual Campus Map Container with Interactive Pins */}
            <View style={[modalStyles.mapContainer, { borderColor: colors.border }]}>
              {activeTab === 'campus' ? (
                <View style={modalStyles.mapWrapper}>
                  <Image source={KNUST_MAP_ASSET} style={modalStyles.mapImage} resizeMode="cover" />

                  {/* Other KNUST Meetup Location Pins */}
                  {KNUST_CAMPUS_VENUES.map((v) => {
                    const isSelected = v.name === matchedVenue.name;
                    return (
                      <Pressable
                        key={v.name}
                        onPress={() => {
                          tapMedium();
                          // Switch active meetup to one matching this venue if available
                          const found = allMeetups.find((m) =>
                            m.location.toLowerCase().includes(v.tag.toLowerCase())
                          );
                          if (found) {
                            setActiveMeetup(found);
                          }
                        }}
                        style={[
                          modalStyles.pinWrapper,
                          { left: `${v.mapCoordX}%`, top: `${v.mapCoordY}%` },
                        ]}
                      >
                        {isSelected && <View style={modalStyles.pinPulse} />}
                        <View style={[modalStyles.pinHead, isSelected && modalStyles.pinHeadSelected]}>
                          <Ionicons
                            name={isSelected ? 'location' : 'ellipse'}
                            size={isSelected ? 16 : 8}
                            color="#fff"
                          />
                        </View>
                        {isSelected && (
                          <View style={modalStyles.pinCallout}>
                            <Text style={modalStyles.pinCalloutText} numberOfLines={1}>
                              {currentMeetup.title}
                            </Text>
                            <Text style={modalStyles.pinCalloutSub} numberOfLines={1}>
                              {v.name}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}

                  {/* Compass / Orientation Watermark */}
                  <View style={modalStyles.compassBadge}>
                    <Ionicons name="compass-outline" size={12} color="#1E293B" />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#1E293B' }}>KNUST CAMPUS</Text>
                  </View>
                </View>
              ) : (
                /* Real, interactive Google Maps — pannable and zoomable,
                   centred on this venue's actual GPS coordinates. This
                   replaces the old static Yandex snapshot with the genuine
                   Google Maps product the map was missing. */
                <View style={modalStyles.mapWrapper}>
                  <WebView
                    key={`${lat}-${lng}`}
                    source={{ uri: `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed` }}
                    style={modalStyles.mapImage}
                    startInLoadingState
                    renderLoading={() => (
                      <View style={[modalStyles.mapImage, modalStyles.webviewLoading]}>
                        <ActivityIndicator color="#fff" size="large" />
                        <Text style={{ color: '#fff', fontSize: 11, marginTop: 8 }}>Loading Google Maps…</Text>
                      </View>
                    )}
                  />
                  <View style={modalStyles.gpsOverlayInfo} pointerEvents="none">
                    <Ionicons name="navigate-circle" size={14} color="#10B981" />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                      GPS: {lat.toFixed(4)}° N, {Math.abs(lng).toFixed(4)}° W
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Meetup Details Card */}
            <View style={[modalStyles.detailsCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={[modalStyles.meetupTitle, { color: colors.text }]}>{currentMeetup.title}</Text>
                  <Text style={[modalStyles.venueName, { color: brand.primary }]}>📍 {matchedVenue.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{currentMeetup.location}</Text>
                </View>
                <Pill label={`${currentMeetup.rsvpCount} Going`} compact tint="#EBF7EE" textColor="#2F8B4E" />
              </View>

              {/* Walking Distance Banner */}
              <View style={modalStyles.walkingBanner}>
                <Ionicons name="walk" size={16} color="#1E40AF" />
                <Text style={modalStyles.walkingText}>{walkingNote}</Text>
              </View>

              {/* Host & Date info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  Host: <Text style={{ fontWeight: '700', color: colors.text }}>{currentMeetup.organizer}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>🕒 {currentMeetup.dateTime}</Text>
              </View>
            </View>

            {/* Turn-by-Turn Walking Directions Accordion */}
            <Pressable
              onPress={() => {
                tapLight();
                setShowDirectionsList((prev) => !prev);
              }}
              style={[modalStyles.accordionHeader, { borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="corner-up-right" size={14} color={brand.primary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                  Step-by-Step Walking Route on Campus
                </Text>
              </View>
              <Ionicons
                name={showDirectionsList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.muted}
              />
            </Pressable>

            {showDirectionsList && (
              <View style={[modalStyles.directionsList, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                {directionsSteps.map((step, idx) => (
                  <View key={idx} style={modalStyles.directionStepRow}>
                    <View style={modalStyles.stepNumberBubble}>
                      <Text style={modalStyles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={[modalStyles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Switch KNUST Study Venues */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 6 }}>
              Explore Other KNUST Meetup Venues:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {KNUST_CAMPUS_VENUES.map((v) => {
                const isSelected = v.name === matchedVenue.name;
                return (
                  <Pressable
                    key={v.name}
                    onPress={() => {
                      tapLight();
                      const matchingMeetup = allMeetups.find((m) =>
                        m.location.toLowerCase().includes(v.tag.toLowerCase())
                      );
                      if (matchingMeetup) {
                        setActiveMeetup(matchingMeetup);
                      }
                    }}
                    style={[
                      modalStyles.venueChip,
                      {
                        backgroundColor: isSelected ? brand.primary : colors.inputBg,
                        borderColor: isSelected ? brand.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        modalStyles.venueChipText,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {v.tag}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ gap: 8, marginTop: 16 }}>
              <Pressable
                onPress={handleOpenLiveNavigation}
                style={({ pressed }) => [modalStyles.navButton, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={modalStyles.navButtonText}>Get Walking Directions in Google Maps</Text>
              </Pressable>

              {onRSVP && (
                <PrimaryButton
                  label={currentMeetup.rsvpStatus ? 'Going (RSVP Confirmed ✓)' : 'RSVP to Attend (+50 Pts)'}
                  onPress={() => {
                    notifySuccess();
                    onRSVP(currentMeetup);
                  }}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: brand.primary,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#fff',
  },
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#0F172A',
  },
  mapWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },
  pinPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    top: -4,
  },
  pinHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  pinHeadSelected: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.15 }],
  },
  pinCallout: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pinCalloutText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  pinCalloutSub: {
    fontSize: 8,
    color: '#94A3B8',
  },
  compassBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gpsOverlayInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailsCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  meetupTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  venueName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  walkingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  walkingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  directionsList: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
    gap: 8,
  },
  directionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumberBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  stepText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  venueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  venueChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
