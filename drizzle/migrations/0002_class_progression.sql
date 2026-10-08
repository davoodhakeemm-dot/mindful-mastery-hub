ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS completed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS student_progress_user_lesson_uniq ON public.student_progress(user_id, lesson_id);
REVOKE INSERT, UPDATE ON public.student_progress FROM authenticated;

CREATE TABLE IF NOT EXISTS public.class_unlocks (
  user_id uuid PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.class_unlocks TO authenticated;
GRANT ALL ON public.class_unlocks TO service_role;
ALTER TABLE public.class_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own unlock" ON public.class_unlocks FOR SELECT TO authenticated USING (user_id = auth.uid());