import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { AppRoute, useAppStore } from '@/context/AppStoreContext';
import { brand } from '@/data/mockData';
import {
  AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { PrimaryButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';

export type NotificationCategory = 'All' | 'Unread' | 'Sessions' | 'Meetups' | 'Messages' | 'Community';

export interface ActivityNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  category: 'Sessions' | 'Meetups' | 'Messages' | 'Community';
  unread: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  route: AppRoute;
}

/** Formats an ISO timestamp the way the notification center displays it (mirrors posts.ts's relativeTime). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/**
 * `data.type` is set by the DB triggers/reminder job that queue each row
 * (see supabase_migration_03_phase3.sql and supabase_migration_04_phase4.sql):
 * 'session_reminder' | 'meetup_reminder' | 'message' | 'post'. This maps that
 * onto the category pill, icon and route this UI already understands — an
 * unrecognized or missing type (nothing currently queues one, but the queue
 * is append-only server-side code we don't control) falls back to a generic
 * Community/bell entry rather than being dropped.
 */
function describeNotification(type: string | undefined): {
  category: ActivityNotification['category'];
  icon: keyof typeof Ionicons.glyphMap;
  route: AppRoute;
} {
  switch (type) {
    case 'session_reminder':
      return { category: 'Sessions', icon: 'videocam', route: 'session-lobby' };
    case 'meetup_reminder':
      return { category: 'Meetups', icon: 'location', route: 'main-sessions' };
    case 'message':
      return { category: 'Messages', icon: 'chatbubble-ellipses', route: 'private-chat' };
    case 'post':
      return { category: 'Community', icon: 'megaphone', route: 'community-details' };
    default:
      return { category: 'Community', icon: 'notifications', route: 'main-home' };
  }
}

function toActivityNotification(n: AppNotification): ActivityNotification {
  const { category, icon, route } = describeNotification(n.data?.type);
  return {
    id: n.id,
    title: n.title,
    message: n.body,
    time: relativeTime(n.createdAt),
    category,
    unread: !n.isRead,
    icon,
    route,
  };
}

export function NotificationCenterModal({
  visible,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
}) {
  const colors = useThemeColors();
  const { profile } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('All');
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

  // Load the real queue while the center is open, and stay live for as long
  // as it's on screen — a message, post or reminder queued while the user is
  // looking at the bell should show up without them having to close and
  // reopen it (SRS 3.8: "Notifications must be real-time").
  useEffect(() => {
    if (!visible || !profile.id) return;
    let active = true;

    getNotifications(profile.id).then((rows) => {
      if (active) setNotifications(rows.map(toActivityNotification));
    });

    const unsubscribe = subscribeToNotifications(profile.id, (row) => {
      if (!active) return;
      setNotifications((prev) => {
        if (prev.some((existing) => existing.id === row.id)) return prev;
        return [toActivityNotification(row), ...prev];
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [visible, profile.id]);

  if (!visible) return null;

  const categories: NotificationCategory[] = ['All', 'Unread', 'Sessions', 'Meetups', 'Messages', 'Community'];

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'Unread') return n.unread;
    if (activeCategory === 'All') return true;
    return n.category === activeCategory;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (profile.id) {
      markAllNotificationsRead(profile.id);
    }
  };

  const handleSelectNotification = (n: ActivityNotification) => {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item)));
    markNotificationRead(n.id);
    onClose();
    onNavigate(n.route);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Modal Header Bar */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Notification Center</Text>
              <Text style={styles.mutedCopySmall}>
                {unreadCount > 0 ? `${unreadCount} unread activity alerts` : 'All caught up!'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {unreadCount > 0 ? (
                <Pressable onPress={handleMarkAllRead}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: brand.primary }}>Mark All Read</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginVertical: 4 }}>
            {categories.map((cat) => (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)}>
                <Pill label={cat} active={activeCategory === cat} compact />
              </Pressable>
            ))}
          </ScrollView>

          {/* Notifications Feed */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {filteredNotifications.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
                <Text style={[styles.mutedCopy, { marginTop: 8 }]}>No activity alerts in this category.</Text>
              </View>
            ) : (
              filteredNotifications.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => handleSelectNotification(n)}
                  style={[styles.notificationRow, n.unread ? styles.notificationUnreadRow : undefined]}
                >
                  <View style={styles.notificationIconWrap}>
                    <Ionicons name={n.icon} size={20} color={brand.primary} />
                  </View>

                  <View style={styles.flexFill}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.communityName, { fontSize: 14 }]} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.mutedCopySmall}>{n.time}</Text>
                    </View>
                    <Text style={[styles.mutedCopySmall, { color: colors.text, marginTop: 2 }]} numberOfLines={2}>
                      {n.message}
                    </Text>
                  </View>

                  {n.unread ? <View style={styles.notificationUnreadDot} /> : null}
                </Pressable>
              ))
            )}
          </ScrollView>

          <PrimaryButton label="Close Center" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
