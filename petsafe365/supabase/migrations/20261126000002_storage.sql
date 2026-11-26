-- 비공개 문서 버킷. 크기와 MIME 은 서버(스토리지)에서 다시 검증한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-documents', 'pet-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 경로 첫 폴더가 자기 user id 인 파일만 다룰 수 있다. 열람은 짧은 만료의 서명 URL 로만 한다.
create policy pet_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pet_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pet_documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
