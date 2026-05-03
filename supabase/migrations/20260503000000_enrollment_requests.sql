-- ─── Enrollment Requests ──────────────────────────────────────────────────────
-- Teachers submit enroll/withdraw requests; headmaster approves or rejects.
-- On approval, a SECURITY DEFINER function applies the actual change to students.

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT        NOT NULL CHECK (type IN ('enroll', 'withdraw')),
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),

  -- For both: which class is affected
  student_class_id  UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- For 'withdraw': the existing student
  student_id        UUID        REFERENCES students(id) ON DELETE SET NULL,

  -- For 'enroll': new student data
  student_name      TEXT,
  parent_phone      TEXT,

  -- Audit
  requested_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS enrollment_requests_status_idx
  ON enrollment_requests (status);

CREATE INDEX IF NOT EXISTS enrollment_requests_requested_by_idx
  ON enrollment_requests (requested_by);

CREATE INDEX IF NOT EXISTS enrollment_requests_class_idx
  ON enrollment_requests (student_class_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Teachers: insert their own requests
CREATE POLICY "teachers_insert_own_requests"
  ON enrollment_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Teachers: see their own; admins see all
CREATE POLICY "select_enrollment_requests"
  ON enrollment_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('headmaster', 'proprietress')
    )
  );

-- Admins only: update status (approve/reject)
CREATE POLICY "admins_update_enrollment_requests"
  ON enrollment_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('headmaster', 'proprietress')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('headmaster', 'proprietress')
    )
  );

-- ─── Approval function (SECURITY DEFINER bypasses RLS to modify students) ─────

CREATE OR REPLACE FUNCTION approve_enrollment_request(
  p_request_id UUID,
  p_reviewer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req enrollment_requests%ROWTYPE;
BEGIN
  -- Fetch and lock the pending request
  SELECT * INTO req
    FROM enrollment_requests
   WHERE id = p_request_id AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or already processed', p_request_id;
  END IF;

  -- Mark as approved
  UPDATE enrollment_requests
     SET status      = 'approved',
         reviewed_by = p_reviewer_id,
         reviewed_at = now()
   WHERE id = p_request_id;

  -- Apply the change
  IF req.type = 'enroll' THEN
    INSERT INTO students (full_name, class_id, parent_phone, is_active)
    VALUES (req.student_name, req.student_class_id, req.parent_phone, true);

  ELSIF req.type = 'withdraw' THEN
    UPDATE students
       SET is_active = false
     WHERE id = req.student_id;
  END IF;
END;
$$;

-- ─── Rejection function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reject_enrollment_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE enrollment_requests
     SET status      = 'rejected',
         reviewed_by = p_reviewer_id,
         reviewed_at = now(),
         review_note = p_reason
   WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or already processed', p_request_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (RLS inside the functions handles auth)
GRANT EXECUTE ON FUNCTION approve_enrollment_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_enrollment_request(UUID, UUID, TEXT) TO authenticated;
