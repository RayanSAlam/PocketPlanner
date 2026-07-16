-- PREREQUISITE: create a PRIVATE Storage bucket named "documents" via
-- Dashboard -> Storage -> New bucket (uncheck "Public") BEFORE running
-- this file. storage.objects already has RLS enabled by default in
-- Supabase projects; this file only adds policies scoped to that bucket.
--
-- Files are stored under a per-user folder prefix: "<user_id>/<document_id>/<filename>"
-- so (storage.foldername(name))[1] (the first path segment) is always the
-- owner's auth.uid() as text.

create policy "documents_storage_select_own"
on storage.objects for select
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_storage_insert_own"
on storage.objects for insert
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_storage_update_own"
on storage.objects for update
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_storage_delete_own"
on storage.objects for delete
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
