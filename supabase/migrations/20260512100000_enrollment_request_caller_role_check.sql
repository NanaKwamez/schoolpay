-- ─── Security hardening: gate enrollment approval RPCs on caller's role ──────
-- The original SECURITY DEFINER functions in 20260503000000 trusted the
-- client-supplied `p_reviewer_id` and would happily run for any authenticated
-- caller. A teacher could call them via supabase.rpc(...) and approve their
-- own pending requests (or reject anyone's), bypassing the RLS UPDATE policy.
-- We now derive the reviewer from auth.uid() and require headmaster /
-- proprietress before mutating anything.

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
  req           enrollment_requests%ROWTYPE;
  caller_id     UUID := auth.uid();
  caller_role   TEXT;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role FROM user_profiles WHERE id = caller_id;

  IF caller_role NOT IN ('headmaster', 'proprietress') THEN
    RAISE EXCEPTION 'Forbidden: only admins may approve enrollment requests';
  END IF;

  -- Ignore client-supplied reviewer id; use auth.uid() as the source of truth.
  -- We still accept the argument to keep the existing client API stable.
  PERFORM p_reviewer_id;

  SELECT * INTO req
    FROM enrollment_requests
   WHERE id = p_request_id AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or already processed', p_request_id;
  END IF;

  UPDATE enrollment_requests
     SET status      = 'approved',
         reviewed_by = caller_id,
         reviewed_at = now()
   WHERE id = p_request_id;

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
DECLARE
  caller_id   UUID := auth.uid();
  caller_role TEXT;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role FROM user_profiles WHERE id = caller_id;

  IF caller_role NOT IN ('headmaster', 'proprietress') THEN
    RAISE EXCEPTION 'Forbidden: only admins may reject enrollment requests';
  END IF;

  PERFORM p_reviewer_id;

  UPDATE enrollment_requests
     SET status      = 'rejected',
         reviewed_by = caller_id,
         reviewed_at = now(),
         review_note = p_reason
   WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or already processed', p_request_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_enrollment_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_enrollment_request(UUID, UUID, TEXT) TO authenticated;
