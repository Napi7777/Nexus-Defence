-- =====================================================================
-- 0012_storage_buckets.sql
-- Storage buckets + RLS policies on storage.objects.
-- Run this AFTER everything above (it references profiles/communities).
-- Bucket path convention used throughout: the first path segment is
-- always the owning user's or community's UUID, e.g.
--   avatars/<user_id>/profile.jpg
--   community-covers/<community_id>/cover.jpg
--   resources/<community_id>/<filename>
--   chat-attachments/<conversation_id>/<filename>
--   recordings/<tutor_id>/<filename>
-- storage.foldername(name) splits that path into an array so policies
-- can check ownership from the object's own path.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('community-covers', 'community-covers', true),
  ('resources', 'resources', false),
  ('chat-attachments', 'chat-attachments', false),
  ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- avatars — public read, owner can write their own folder
-- ---------------------------------------------------------------------
create policy "avatar images are publicly readable"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "a user can upload/replace their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "a user can update/delete their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "a user can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- community-covers — public read, owner/moderator of the community can write
-- ---------------------------------------------------------------------
create policy "community cover images are publicly readable"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-covers');

create policy "owners/moderators can upload a community cover image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

create policy "owners/moderators can replace/remove a community cover image"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

create policy "owners/moderators can delete a community cover image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

-- ---------------------------------------------------------------------
-- resources — private, readable by community members, writable by members
-- ---------------------------------------------------------------------
create policy "community members can read shared resource files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resources'
    and is_community_member(((storage.foldername(name))[1])::uuid)
  );

create policy "community members can upload resource files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and is_community_member(((storage.foldername(name))[1])::uuid)
  );

create policy "uploader or moderators can delete a resource file"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resources'
    and (
      owner = auth.uid()
      or community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
    )
  );

-- ---------------------------------------------------------------------
-- chat-attachments — private, readable/writable only by conversation participants
-- ---------------------------------------------------------------------
create policy "conversation participants can read chat attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "conversation participants can upload chat attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------
-- recordings — private-ish; readable by anyone with community access,
-- writable only by the tutor who owns that folder.
-- NOTE: Supabase Storage has per-file size limits (see project Storage
-- settings) and is fine for short clips, but for long lecture videos at
-- scale, prefer an external video host (Mux, YouTube unlisted, Cloudflare
-- Stream) and store only the resulting URL in recorded_content.video_url.
-- ---------------------------------------------------------------------
create policy "recordings are readable by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'recordings');

create policy "a tutor can upload recordings to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
    and is_tutor_or_admin()
  );

create policy "a tutor can delete their own recordings"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
