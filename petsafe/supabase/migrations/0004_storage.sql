-- 펫안심365 마이그레이션 0004: 비공개 문서 버킷 (Supabase Storage 전용. 로컬 PostgreSQL 테스트에서는 건너뜀)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-documents', 'pet-documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 경로 규칙: {owner_user_id}/{pet_id}/{document_id}.{ext}
create policy "pet-documents: owner read" on storage.objects for select
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pet-documents: owner insert" on storage.objects for insert
  with check (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pet-documents: owner delete" on storage.objects for delete
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
