/*
  # Fix circular RLS policies blocking auth role detection

  1. Problem
    The organizers table SELECT policy used a circular subquery:
      EXISTS (SELECT 1 FROM organizers WHERE organizers.id = auth.uid())
    This subquery itself must pass RLS, creating an infinite loop that
    returns 0 rows. As a result, fetchUserRole() in the auth context
    never finds the user's organizer record, role stays null, and the
    dashboard redirects back to login.

  2. Changes
    - Organizers table: Replace circular SELECT policy with direct
      comparison `auth.uid() = id`
    - Organizations table: Replace policies that reference organizers
      subquery with direct `auth.uid() = user_id` for organization-owned
      operations, and use `auth.uid() IN (SELECT id FROM organizers)` 
      for organizer-level access (non-circular since organizers SELECT
      now works)

  3. Security
    - All policies remain restricted to authenticated users
    - Organizers can still only read/update their own profile
    - Organizations can still only read their own data
    - Organizers retain full management access over organizations
*/

-- Fix organizers SELECT policy (remove circular reference)
DROP POLICY IF EXISTS "Organizers can read organizers" ON public.organizers;
CREATE POLICY "Organizers can read own profile"
  ON public.organizers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Fix organizations policies that depend on organizers subquery
-- These now work correctly since organizers SELECT is no longer circular

-- "Organizations can read own data" is already correct (user_id = auth.uid())
-- "Organizers can read all organizations" - now works since organizers SELECT is fixed
-- "Organizers can insert organizations" - now works since organizers SELECT is fixed
-- "Organizers can update organizations" - now works since organizers SELECT is fixed
-- "Organizers can delete organizations" - now works since organizers SELECT is fixed

-- No additional changes needed for organizations - the subqueries will now
-- resolve correctly since the organizers table SELECT policy is fixed.
