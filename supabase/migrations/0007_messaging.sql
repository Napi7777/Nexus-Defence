-- =====================================================================
-- 0007_messaging.sql
-- Real-time chat: 1:1 private messages, group chats, community discussions.
-- Covers SRS 3.7 (Communication System) — real-time delivery comes from
-- enabling Supabase Realtime on `messages` (see 0013_realtime.sql).
-- =====================================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,                      -- used for group chats; null for 1:1
  community_id uuid references communities(id) on delete cascade, -- set for a community's group discussion, null for ad-hoc chats
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text,
  attachment_url text,          -- file/link sharing within chat
  created_at timestamptz not null default now(),
  constraint chk_message_has_body check (content is not null or attachment_url is not null)
);

create index idx_conversation_participants_user on conversation_participants(user_id);
create index idx_messages_conversation on messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Helper: is auth.uid() a participant in this conversation?
-- ---------------------------------------------------------------------
create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

-- Auto-add the creator as a participant.
create or replace function handle_new_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into conversation_participants (conversation_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_new_conversation_participant
  after insert on conversations
  for each row execute function handle_new_conversation();

-- ---------------------------------------------------------------------
-- RLS: conversations
-- ---------------------------------------------------------------------
alter table conversations enable row level security;

create policy "only participants can see a conversation"
  on conversations for select
  to authenticated
  using (
    is_conversation_participant(id)
    or created_by = auth.uid()  -- covers the instant of creation, before the
                                 -- AFTER INSERT trigger has added the creator
                                 -- to conversation_participants (matters for
                                 -- `... RETURNING *` on the INSERT)
    or is_admin()
  );

create policy "any authenticated user can start a conversation"
  on conversations for insert
  to authenticated
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- RLS: conversation_participants
-- ---------------------------------------------------------------------
alter table conversation_participants enable row level security;

create policy "only participants can see the participant list"
  on conversation_participants for select
  to authenticated
  using (is_conversation_participant(conversation_id) or is_admin());

create policy "an existing participant can add others (group chats) or join themselves"
  on conversation_participants for insert
  to authenticated
  with check (user_id = auth.uid() or is_conversation_participant(conversation_id));

create policy "a participant can update their own read receipt"
  on conversation_participants for update
  to authenticated
  using (user_id = auth.uid());

create policy "a participant can leave a conversation"
  on conversation_participants for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RLS: messages
-- ---------------------------------------------------------------------
alter table messages enable row level security;

create policy "only participants can read messages"
  on messages for select
  to authenticated
  using (is_conversation_participant(conversation_id) or is_admin());

create policy "only participants can send messages"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id));

create policy "a sender can delete their own message"
  on messages for delete
  to authenticated
  using (sender_id = auth.uid() or is_admin());
