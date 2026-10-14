/*
# VLPv2 Core Schema — Organizations, Users, Profiles, Domain Memberships, Offerings, Enrollments

1. New Tables
- `organizations` — Campuses and units within CBSUA
- `profiles` — Extended user info linked to auth.users
- `domain_memberships` — Links a user to a domain with a role
- `offerings` — Courses/training/MOOCs belonging to a domain
- `enrollments` — Links users to offerings with enrollment status

2. Security
- RLS enabled on all tables
- Ownership-based access using auth.uid()
- Admin override via domain_memberships role check

3. Important Notes
- Tables created first, policies added after so cross-table references resolve
- Profile user_id defaults to auth.uid()
- Domain memberships drive cross-domain authorization
*/

-- Organizations (campuses, units)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'campus',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_organizations" ON organizations;
CREATE POLICY "select_organizations" ON organizations FOR SELECT
  TO authenticated USING (true);

-- Profiles (extended user data)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  external_id text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Domain memberships
CREATE TABLE IF NOT EXISTS domain_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain IN ('academic', 'lnd', 'mooc')),
  role text NOT NULL CHECK (role IN ('admin', 'faculty', 'facilitator', 'student', 'learner', 'mooc_learner', 'guardian')),
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, domain, role)
);

ALTER TABLE domain_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_memberships" ON domain_memberships;
CREATE POLICY "select_own_memberships" ON domain_memberships FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_membership" ON domain_memberships;
CREATE POLICY "insert_own_membership" ON domain_memberships FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Offerings (courses, training programs, MOOCs)
CREATE TABLE IF NOT EXISTS offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  code text,
  domain text NOT NULL CHECK (domain IN ('academic', 'lnd', 'mooc')),
  organization_id uuid REFERENCES organizations(id),
  offering_type text NOT NULL DEFAULT 'course',
  is_published boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT false,
  payment_status text DEFAULT 'free',
  start_date date,
  end_date date,
  pacing text DEFAULT 'cohort',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'student', 'faculty', 'facilitator', 'auditor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'waitlist', 'pending', 'rejected')),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, offering_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Now add policies that reference both tables

-- Offerings policies
DROP POLICY IF EXISTS "select_offerings" ON offerings;
CREATE POLICY "select_offerings" ON offerings FOR SELECT
  TO authenticated USING (
    is_public = true
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.offering_id = offerings.id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "insert_offerings" ON offerings;
CREATE POLICY "insert_offerings" ON offerings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role IN ('admin', 'faculty', 'facilitator')
    )
  );

DROP POLICY IF EXISTS "update_offerings" ON offerings;
CREATE POLICY "update_offerings" ON offerings FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  ) WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delete_offerings" ON offerings;
CREATE POLICY "delete_offerings" ON offerings FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  );

-- Enrollments policies
DROP POLICY IF EXISTS "select_own_enrollments" ON enrollments;
CREATE POLICY "select_own_enrollments" ON enrollments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM offerings o
      WHERE o.id = enrollments.offering_id AND o.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e2
      WHERE e2.offering_id = enrollments.offering_id
        AND e2.user_id = auth.uid()
        AND e2.role IN ('faculty', 'facilitator')
    )
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "insert_own_enrollment" ON enrollments;
CREATE POLICY "insert_own_enrollment" ON enrollments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_enrollment" ON enrollments;
CREATE POLICY "update_enrollment" ON enrollments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM offerings o
      WHERE o.id = enrollments.offering_id AND o.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e2
      WHERE e2.offering_id = enrollments.offering_id
        AND e2.user_id = auth.uid()
        AND e2.role IN ('faculty', 'facilitator')
    )
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
    OR user_id = auth.uid()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM offerings o
      WHERE o.id = enrollments.offering_id AND o.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e2
      WHERE e2.offering_id = enrollments.offering_id
        AND e2.user_id = auth.uid()
        AND e2.role IN ('faculty', 'facilitator')
    )
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "delete_enrollment" ON enrollments;
CREATE POLICY "delete_enrollment" ON enrollments FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.role = 'admin'
    )
  );
