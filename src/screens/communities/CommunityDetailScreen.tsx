import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportSheet } from '@/components/overlays';
import { SkeletonList, useToast } from '@/components/feedback';
import {
  Avatar,
  GhostSmallButton,
  Pill,
  PrimarySmallButton,
  Text,
} from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, CommunityItem, DEFAULT_AVATAR } from '@/data/mockData';
import { tapMedium } from '@/lib/haptics';
import {
  awardPoints,
  createCommunityPost,
  createPostComment,
  getCommunityPosts,
  getPostComments,
  PostComment,
  subscribeToCommunityPosts,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function CommunityDetailScreen({
  community,
  onBack,
  onJoin,
  onOpenChat,
  onScheduleSession,
  onOpenMembers,
}: {
  onOpenMembers?: () => void;
  community: CommunityItem;
  onBack: () => void;
  onJoin?: () => void;
  onOpenChat?: () => void;
  onScheduleSession?: () => void;
}) {
  const { profile, updateProfile, recordActivity } = useAppStore();
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentsLoadingId, setCommentsLoadingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const toast = useToast();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postsFeedList, setPostsFeedList] = useState(
    (community.postsFeed || []).map((p) => ({
      ...p,
      authorAvatar: DEFAULT_AVATAR,
    }))
  );
  const [postsLoading, setPostsLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<{ id: string; label: string } | null>(null);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Posts used to live only in this component's state, so every discussion was
  // lost the moment you navigated away. Read them from the database and
  // subscribe so other members' posts arrive without a refresh.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function loadPosts() {
      const rows = await getCommunityPosts(community.id);
      if (!active) return;
      setPostsFeedList(rows.map((p) => ({ ...p, authorAvatar: DEFAULT_AVATAR })));
      setPostsLoading(false);

      unsubscribe = subscribeToCommunityPosts(community.id, (incoming, authorId) => {
        if (authorId && authorId === profile.id) return;
        setPostsFeedList((prev) =>
          prev.some((p) => p.id === incoming.id)
            ? prev
            : [{ ...incoming, authorAvatar: DEFAULT_AVATAR }, ...prev]
        );
      });
    }

    loadPosts();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [community.id, profile.id]);

  const loadComments = async (postId: string) => {
    setCommentsLoadingId(postId);
    const rows = await getPostComments(postId);
    setCommentsByPost((prev) => ({ ...prev, [postId]: rows }));
    setCommentsLoadingId((prev) => (prev === postId ? null : prev));
  };

  const handleToggleComments = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setCommentDraft('');
    if (!commentsByPost[postId]) {
      loadComments(postId);
    }
  };

  const handleAddComment = async (postId: string) => {
    const body = commentDraft.trim();
    if (!body || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const { data, error } = await createPostComment(postId, body, profile.id);
      if (error) throw error;

      const newComment: PostComment = {
        id: data?.id || `pending-${Date.now()}`,
        postId,
        author: profile.name || 'Student Learner',
        time: 'Just now',
        body,
      };
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), newComment],
      }));
      setCommentDraft('');

      const earned = await awardPoints('comment_created', data?.id);
      updateProfile({ points: (profile.points || 0) + (earned > 0 ? earned : 10) });
      recordActivity('participatedCommunity');
      tapMedium();
    } catch (err: any) {
      toast.show(err?.message || 'Could not post your reply. Try again.', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postBody.trim() || postSubmitting) return;
    setPostSubmitting(true);

    const title = postTitle.trim();
    const body = postBody.trim();

    // Show it immediately, then reconcile with the saved row.
    const optimisticId = `pending-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      author: profile.name || 'Student Learner',
      authorAvatar: profile.avatar || DEFAULT_AVATAR,
      role: 'Student',
      time: 'Just now',
      title,
      body,
      stats: '0 replies',
    };
    setPostsFeedList((prev) => [optimistic, ...prev]);
    setPostTitle('');
    setPostBody('');

    try {
      const { data, error } = await createCommunityPost(community.id, title, body, profile.id);
      if (error) throw error;

      if (data?.id) {
        setPostsFeedList((prev) =>
          prev.map((p) => (p.id === optimisticId ? { ...p, id: data.id } : p))
        );
      }
      const earned = await awardPoints('post_created', data?.id);
      updateProfile({ points: (profile.points || 0) + (earned > 0 ? earned : 30) });
      recordActivity('participatedCommunity');
      tapMedium();
    } catch (err: any) {
      // Roll the optimistic post back so the feed never shows a post that
      // was not saved.
      setPostsFeedList((prev) => prev.filter((p) => p.id !== optimisticId));
      setPostTitle(title);
      setPostBody(body);
      toast.show(err?.message || 'Could not publish your post. Try again.', 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />
      <View style={styles.flexFill}>
        <ScrollView
          contentContainerStyle={[styles.screenContent, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={{ uri: community.image }}
            style={[styles.communityHero, styles.communityHeroBleed]}
          >
            <LinearGradient
              colors={['rgba(7,9,24,0.55)', 'rgba(7,9,24,0.15)', 'rgba(7,9,24,0.9)']}
              locations={[0, 0.4, 1]}
              style={styles.flexFill}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingTop: insets.top + 10,
                }}
              >
                <Pressable
                  hitSlop={HIT_SLOP}
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [styles.heroIconButton, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </Pressable>
                <Text
                  style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {community.name}
                </Text>
              </View>
              <View style={styles.communityHeroBody}>
                <Text style={styles.communityHeroTitle}>{community.name}</Text>
                <Text style={styles.communityHeroMeta}>
                  {community.subject} · {community.members} members · {community.posts} posts
                </Text>
              </View>
            </LinearGradient>
          </ImageBackground>

          <View style={styles.communityTabRow}>
            <Text style={[styles.communityTabText, styles.communityTabTextActive]}>Posts</Text>
            <Pressable
              hitSlop={HIT_SLOP}
              onPress={() => onOpenMembers?.()}
              disabled={!onOpenMembers}
              accessibilityRole="button"
              accessibilityLabel="View members"
            >
              <Text style={styles.communityTabText}>Members</Text>
            </Pressable>
          </View>

          {/* Create New Community Post Box */}
          {!community.joined ? (
            <View style={styles.communityPanel}>
              <Text style={styles.communityPanelHint}>
                Join this community to start a discussion or ask a question.
              </Text>
            </View>
          ) : (
          <View style={styles.communityPanel}>
            <Text style={styles.communityPanelTitle}>Start a discussion (+30 XP)</Text>
            <TextInput
              value={postTitle}
              onChangeText={setPostTitle}
              placeholder="Question or topic title..."
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, marginBottom: 8 }}
            />
            <TextInput
              value={postBody}
              onChangeText={setPostBody}
              placeholder="Share details, problem sets, or study notes..."
              placeholderTextColor={colors.muted}
              multiline
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, height: 60, textAlignVertical: 'top', marginBottom: 10 }}
            />
            <Pressable
              hitSlop={HIT_SLOP}
              onPress={handleCreatePost}
              style={({ pressed }) => [
                { backgroundColor: brand.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                {postSubmitting ? 'Posting...' : 'Post to Group'}
              </Text>
            </Pressable>
          </View>
          )}

          {postsLoading ? (
            <SkeletonList count={2} lines={3} />
          ) : postsFeedList.length === 0 ? (
            <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 12 }}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.muted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' }}>
                No Community Posts Yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                Be the first to start a topic or ask a question using the form above!
              </Text>
            </View>
          ) : (
            postsFeedList.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Avatar source={post.authorAvatar || DEFAULT_AVATAR} size={36} />
                  <View style={styles.flexFill}>
                    <View style={styles.threadTop}>
                      <Text style={styles.threadName}>{post.author}</Text>
                      {post.role ? <Pill label={post.role} tint="#FFF0D6" textColor="#B16A0E" compact /> : null}
                    </View>
                    <Text style={styles.threadTime}>{post.time}</Text>
                  </View>
                  <Pressable
                    hitSlop={HIT_SLOP}
                    onPress={() => setReportTarget({ id: post.id, label: post.title || post.body })}
                    accessibilityRole="button"
                    accessibilityLabel={`Report post by ${post.author}`}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postBody}>{post.body}</Text>

                <Pressable
                  hitSlop={HIT_SLOP}
                  onPress={() => handleToggleComments(post.id)}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    expandedPostId === post.id ? 'Hide replies' : 'View and add replies'
                  }
                >
                  <Ionicons name="chatbubble-outline" size={14} color={colors.muted} />
                  <Text style={styles.mutedCopySmall}>
                    {commentsByPost[post.id]?.length
                      ? `${commentsByPost[post.id].length} ${commentsByPost[post.id].length === 1 ? 'reply' : 'replies'}`
                      : expandedPostId === post.id
                        ? 'Hide replies'
                        : 'Reply'}
                  </Text>
                </Pressable>

                {expandedPostId === post.id ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {commentsLoadingId === post.id ? (
                      <SkeletonList count={1} lines={2} />
                    ) : (
                      (commentsByPost[post.id] ?? []).map((comment) => (
                        <View
                          key={comment.id}
                          style={{
                            backgroundColor: colors.inputBg,
                            borderRadius: 10,
                            padding: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                              {comment.author}
                            </Text>
                            <Text style={styles.mutedCopySmall}>{comment.time}</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>
                            {comment.body}
                          </Text>
                        </View>
                      ))
                    )}

                    {community.joined ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          value={commentDraft}
                          onChangeText={setCommentDraft}
                          placeholder="Write a reply... (+10 XP)"
                          placeholderTextColor={colors.muted}
                          style={{
                            flex: 1,
                            backgroundColor: colors.inputBg,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 13,
                            color: colors.text,
                          }}
                        />
                        <Pressable
                          hitSlop={HIT_SLOP}
                          onPress={() => handleAddComment(post.id)}
                          disabled={!commentDraft.trim() || commentSubmitting}
                          style={({ pressed }) => [
                            {
                              backgroundColor: brand.primary,
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                            (!commentDraft.trim() || commentSubmitting) && { opacity: 0.5 },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.stickyBottomActions, { paddingBottom: insets.bottom + 14 }]}>
          {onOpenChat ? <PrimarySmallButton label="Open Chat" onPress={onOpenChat} /> : null}
          {onScheduleSession ? (
            <GhostSmallButton label="Schedule Session" onPress={onScheduleSession} />
          ) : null}
        </View>
      </View>


      <ReportSheet
        visible={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetType="post"
        targetId={reportTarget?.id ?? ''}
        targetLabel={reportTarget?.label}
      />
    </View>
  );
}
