CREATE OR REPLACE FUNCTION public.switch_my_role(_role app_role)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _role NOT IN ('teacher'::app_role, 'student'::app_role) THEN
    RAISE EXCEPTION 'Only teacher or student roles can be switched';
  END IF;

  SELECT role INTO _current FROM public.user_roles WHERE user_id = _uid LIMIT 1;

  IF _current IS NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
    RETURN _role;
  END IF;

  IF _current = 'admin'::app_role THEN
    RETURN _current;
  END IF;

  UPDATE public.user_roles SET role = _role WHERE user_id = _uid;
  RETURN _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_my_role(app_role) TO authenticated;