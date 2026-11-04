-- Stops people changing their own access. The policy "Users can update own profile" lets anyone edit
-- their own row, so without this a signed-in user could set role = 'admin' on themselves.
--
-- Only a manager or admin may change role, status or beneficiary_code, and only an admin may grant
-- admin. Server code using the service key has no signed-in user (auth.uid() is null) and is not
-- affected. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.guard_profile_access()
RETURNS TRIGGER AS $$
DECLARE
  caller user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.beneficiary_code IS DISTINCT FROM OLD.beneficiary_code THEN
    caller := public.get_user_role();
    IF caller IS NULL OR caller NOT IN ('admin', 'manager') THEN
      RAISE EXCEPTION 'Only a manager or admin can change a role, status or beneficiary code.' USING ERRCODE = '42501';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role::text IN ('admin', 'super_admin') AND caller::text <> 'admin' THEN
      RAISE EXCEPTION 'Only an admin can make someone an admin.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_profile_access ON profiles;
CREATE TRIGGER guard_profile_access BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_access();
