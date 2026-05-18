-- Proprietress-only: archive current term and insert the next Ghana-calendar term.

CREATE OR REPLACE FUNCTION public.start_new_term()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r text;
  cur_term text;
  cur_year integer;
  next_term text;
  next_year integer;
  start_d date;
  end_d date;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT up.role INTO r FROM public.user_profiles up WHERE up.id = uid;
  IF r IS DISTINCT FROM 'proprietress' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT t.term::text, t.year
  INTO cur_term, cur_year
  FROM public.terms t
  WHERE t.is_current = TRUE
  LIMIT 1;

  IF cur_term IS NULL THEN
    RAISE EXCEPTION 'no current term';
  END IF;

  UPDATE public.terms SET is_current = FALSE WHERE is_current = TRUE;

  IF cur_term = '3' THEN
    next_term := '1';
    next_year := cur_year + 1;
  ELSIF cur_term = '1' THEN
    next_term := '2';
    next_year := cur_year;
  ELSIF cur_term = '2' THEN
    next_term := '3';
    next_year := cur_year;
  ELSE
    RAISE EXCEPTION 'unexpected term value: %', cur_term;
  END IF;

  start_d := ((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Accra'))::date;
  end_d := (start_d + interval '4 months')::date;

  INSERT INTO public.terms (term, year, start_date, end_date, is_current)
  VALUES (next_term, next_year, start_d, end_d, TRUE)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'id', new_id,
    'term', next_term,
    'year', next_year,
    'start_date', start_d,
    'end_date', end_d
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_new_term() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_new_term() TO authenticated;
