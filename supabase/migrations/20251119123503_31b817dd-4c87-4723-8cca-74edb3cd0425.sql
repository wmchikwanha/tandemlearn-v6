-- Step 1: Clean up any trailing/leading spaces in profiles full_name
UPDATE profiles 
SET full_name = TRIM(full_name) 
WHERE full_name != TRIM(full_name);

-- Step 2: Add RLS policy so teachers can view all profiles
-- This is critical - without this, teachers can't see the student list!
CREATE POLICY "Teachers can view all profiles"
ON profiles
FOR SELECT
USING (has_role(auth.uid(), 'teacher'));

-- Step 3: Also allow teachers to view student profiles for better UX
CREATE POLICY "Teachers can view students"
ON profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role = 'student'
  )
);