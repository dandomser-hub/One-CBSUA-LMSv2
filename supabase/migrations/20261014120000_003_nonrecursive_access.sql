-- Blocker repair: helpers run as the migration owner and never re-enter RLS.
-- Private schema must not be exposed through PostgREST.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE FUNCTION private.domain_admin(d text, org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.domain_memberships m WHERE m.user_id=auth.uid()
 AND m.domain=d AND m.role='admin' AND (m.organization_id IS NULL OR m.organization_id=org));
$$;
CREATE FUNCTION private.can_teach(d text, org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.domain_memberships m WHERE m.user_id=auth.uid()
 AND m.domain=d AND m.role IN ('faculty','facilitator')
 AND (m.organization_id IS NULL OR m.organization_id=org));
$$;
CREATE FUNCTION private.manage_offering(oid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.offerings o WHERE o.id=oid AND (
 private.domain_admin(o.domain,o.organization_id)
 OR (o.created_by=auth.uid() AND private.can_teach(o.domain,o.organization_id))
 OR EXISTS(SELECT 1 FROM public.enrollments e WHERE e.offering_id=o.id AND e.user_id=auth.uid()
 AND e.status='active' AND e.role IN ('faculty','facilitator'))));
$$;
CREATE FUNCTION private.learn_offering(oid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.offerings o JOIN public.enrollments e ON e.offering_id=o.id
 WHERE o.id=oid AND o.is_published AND e.user_id=auth.uid()
 AND e.role IN ('student','learner','auditor') AND e.status IN ('active','completed'));
$$;
CREATE FUNCTION private.read_offering(oid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.manage_offering(oid) OR private.learn_offering(oid);
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

DROP POLICY select_offerings ON public.offerings;
CREATE POLICY select_offerings ON public.offerings FOR SELECT TO authenticated
 USING ((is_public AND is_published AND domain='mooc') OR private.read_offering(id));
DROP POLICY select_own_enrollments ON public.enrollments;
CREATE POLICY select_own_enrollments ON public.enrollments FOR SELECT TO authenticated
 USING (user_id=auth.uid() OR private.manage_offering(offering_id));
DROP POLICY update_enrollment ON public.enrollments;
CREATE POLICY update_enrollment ON public.enrollments FOR UPDATE TO authenticated
 USING (private.manage_offering(offering_id)) WITH CHECK (private.manage_offering(offering_id));
