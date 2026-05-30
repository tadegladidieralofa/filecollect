/*
  # Fix: Make campaign-files bucket private and remove broad SELECT policy

  1. Changes
    - Set campaign-files bucket to private (public = false)
      This prevents unauthenticated listing of all files in the bucket.
      Signed URLs will be used for individual file access instead.
    - Remove the broad "Public can read campaign files" SELECT policy
      This policy allowed any client to list all objects in the bucket,
      exposing more data than intended.

  2. Security Impact
    - Files can no longer be listed by unauthenticated users
    - Individual file access still works via signed URLs (time-limited)
    - Authenticated users (organizers, organizations) retain access
      through their existing scoped policies
*/

-- Make bucket private to prevent listing
UPDATE storage.buckets
SET public = false
WHERE id = 'campaign-files';

-- Remove the broad public SELECT policy that allows listing all files
DROP POLICY IF EXISTS "Public can read campaign files" ON storage.objects;
