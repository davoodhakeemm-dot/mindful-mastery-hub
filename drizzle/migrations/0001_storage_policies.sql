create policy "users upload own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own photo" on storage.objects for select to authenticated
  using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own photo" on storage.objects for update to authenticated
  using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins read photos" on storage.objects for select to authenticated
  using (bucket_id = 'student-photos' and public.has_role(auth.uid(),'admin'));
create policy "admins manage course media" on storage.objects for all to authenticated
  using (bucket_id = 'course-media' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'course-media' and public.has_role(auth.uid(),'admin'));