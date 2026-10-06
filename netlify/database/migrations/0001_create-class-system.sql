CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  age INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  poster_id TEXT,
  video_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_classes (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  done_at TIMESTAMPTZ,
  admin_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  admin_locked BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id, class_id)
);

CREATE INDEX classes_position_idx ON classes (position);
