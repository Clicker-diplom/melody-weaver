
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', true);

-- Storage policies
CREATE POLICY "Users can upload own audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add file_url column to projects
ALTER TABLE public.projects ADD COLUMN file_url text;
