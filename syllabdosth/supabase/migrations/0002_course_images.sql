-- Course cover images uploaded from Admin → Add course.
-- Public bucket: anyone can view the images; only the server (service-role key) uploads,
-- after checking the user is an admin. The app also creates this bucket automatically
-- on the first upload, so running this file is optional but recommended.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-images', 'course-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
