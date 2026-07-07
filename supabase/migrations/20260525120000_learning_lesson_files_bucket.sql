-- Provision the public Storage bucket used by learning download blocks.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lesson-files', 'lesson-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

DROP POLICY IF EXISTS learning_lesson_files_select ON storage.objects;
CREATE POLICY learning_lesson_files_select
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS learning_lesson_files_insert ON storage.objects;
CREATE POLICY learning_lesson_files_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-files'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'content_editor'
    )
  )
);
