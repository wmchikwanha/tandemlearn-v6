REVOKE EXECUTE ON FUNCTION public.switch_my_role(app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_my_role(app_role) TO authenticated;