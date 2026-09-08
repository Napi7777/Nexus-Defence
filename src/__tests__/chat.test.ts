process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key';

import {
  getMessages,
  sendSupabaseMessage,
  subscribeToThreadMessages,
  createChatThread,
  getUserThreads,
} from '@/lib/supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: 'user-123', email: 'user@nexus.edu' } },
        error: null,
      })),
      getSession: jest.fn(async () => ({
        data: { session: null },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'messages') {
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [
              { id: 'msg-1', thread_id: 'kai', sender_id: 'user-123', content: 'Hello!', created_at: '2026-08-03T01:00:00Z' },
              { id: 'msg-2', thread_id: 'kai', sender_id: 'user-456', content: 'Hi there!', created_at: '2026-08-03T01:01:00Z' },
            ],
            error: null,
          }),
          insert: jest.fn().mockResolvedValue({ data: [{ id: 'msg-3' }], error: null }),
        };
        chain.then = (resolve: any) =>
          resolve({
            data: [
              { id: 'msg-1', thread_id: 'kai', sender_id: 'user-123', content: 'Hello!', created_at: '2026-08-03T01:00:00Z' },
              { id: 'msg-2', thread_id: 'kai', sender_id: 'user-456', content: 'Hi there!', created_at: '2026-08-03T01:01:00Z' },
            ],
            error: null,
          });
        return chain;
      }
      if (table === 'chat_threads') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'thread-789', title: 'Study Group', is_group: false },
            error: null,
          }),
        };
      }
      if (table === 'chat_participants') {
        const chain: any = {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-456', profiles: { full_name: 'Sofia Reyes', avatar_url: '' } }],
            error: null,
          }),
        };
        chain.then = (resolve: any) =>
          resolve({
            data: [
              {
                thread_id: 'thread-789',
                chat_threads: { id: 'thread-789', title: 'Study Group', is_group: false },
              },
            ],
            error: null,
          });
        return chain;
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  })),
}));

describe('Chat Backend Services', () => {
  it('fetches chat messages and maps sender correctly', async () => {
    const messages = await getMessages('kai', 'user-123');
    expect(messages.length).toBe(2);
    expect(messages[0].sender).toBe('me');
    expect(messages[0].text).toBe('Hello!');
    expect(messages[1].sender).toBe('them');
    expect(messages[1].text).toBe('Hi there!');
  });

  it('sends a chat message to Supabase', async () => {
    const result = await sendSupabaseMessage('kai', 'Test message', 'user-123');
    expect(result).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('creates a new chat thread with participants', async () => {
    const result = await createChatThread(['user-123', 'user-456'], 'Study Group', false);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe('thread-789');
    expect(result.error).toBeNull();
  });

  it('fetches user chat threads', async () => {
    const threads = await getUserThreads('user-123');
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe('thread-789');
  });

  it('subscribes and unsubscribes from thread message channel', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToThreadMessages('kai', callback, 'user-123');
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
