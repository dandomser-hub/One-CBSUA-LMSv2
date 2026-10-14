-- Explicit PostgREST relationships; never rely on an auth.users sibling join.
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_profile_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.submissions ADD CONSTRAINT submissions_profile_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.grades ADD CONSTRAINT grades_profile_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_profile_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_profile_fkey FOREIGN KEY(actor_id) REFERENCES public.profiles(user_id);
CREATE INDEX enrollments_offering_status_idx ON public.enrollments(offering_id,status);
CREATE INDEX membership_user_domain_idx ON public.domain_memberships(user_id,domain);
CREATE INDEX submissions_assignment_user_idx ON public.submissions(assignment_id,user_id,submitted_at DESC);
CREATE INDEX attempts_quiz_user_idx ON public.quiz_attempts(quiz_id,user_id);
-- Historical invalid data remains visible to operators; new writes must satisfy these checks.
ALTER TABLE public.quizzes ADD CONSTRAINT quiz_limits CHECK(max_attempts>0 AND (time_limit_minutes IS NULL OR time_limit_minutes>0) AND (open_at IS NULL OR close_at IS NULL OR open_at<close_at)) NOT VALID;
ALTER TABLE public.questions ADD CONSTRAINT positive_question_points CHECK(points>0 AND points::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;
ALTER TABLE public.assignments ADD CONSTRAINT positive_assignment_points CHECK(max_points>0 AND max_points::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;

CREATE FUNCTION public.set_assignment_extension(p_assignment uuid,p_user uuid,p_due timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.manage_offering(private.assignment_offering(p_assignment)) OR NOT private.is_active_learner(private.assignment_offering(p_assignment),p_user) OR p_due IS NULL THEN RAISE EXCEPTION 'Assigned instructor, active learner and due date required'; END IF;
 INSERT INTO public.assignment_extensions VALUES(p_assignment,p_user,p_due) ON CONFLICT(assignment_id,user_id) DO UPDATE SET due_at=excluded.due_at;
 PERFORM private.audit('extend_assignment','assignment',p_assignment,private.assignment_offering(p_assignment),jsonb_build_object('user_id',p_user,'due_at',p_due));
END $$;
CREATE FUNCTION public.record_attendance(p_session uuid,p_user uuid,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oid uuid;
BEGIN
 oid:=private.session_offering(p_session);
 IF oid IS NULL OR NOT private.manage_offering(oid) OR NOT private.is_active_learner(oid,p_user) THEN RAISE EXCEPTION 'Assigned instructor and active learner required'; END IF;
 INSERT INTO public.attendance_records(session_id,user_id,status,recorded_by) VALUES(p_session,p_user,p_status,auth.uid())
 ON CONFLICT(session_id,user_id) DO UPDATE SET status=excluded.status,recorded_by=auth.uid(),recorded_at=now();
 PERFORM private.audit('record_attendance','attendance_session',p_session,oid,jsonb_build_object('user_id',p_user,'status',p_status));
END $$;
CREATE FUNCTION public.assign_membership(p_user uuid,p_domain text,p_role text,p_organization uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.domain_admin(p_domain,p_organization) THEN RAISE EXCEPTION 'Scoped administrator required'; END IF;
 INSERT INTO public.domain_memberships(user_id,domain,role,organization_id) VALUES(p_user,p_domain,p_role,p_organization)
 ON CONFLICT(user_id,domain,role) DO UPDATE SET organization_id=excluded.organization_id
 WHERE private.domain_admin(domain_memberships.domain,domain_memberships.organization_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Cannot change membership outside your scope'; END IF;
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,domain,after_value)
 VALUES(auth.uid(),'assign_membership','user',p_user,p_domain,jsonb_build_object('role',p_role,'organization_id',p_organization));
END $$;
CREATE FUNCTION public.assign_enrollment(p_offering uuid,p_user uuid,p_role text,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.offerings; old_role text;
BEGIN
 SELECT * INTO o FROM public.offerings WHERE id=p_offering;
 IF NOT FOUND OR NOT private.domain_admin(o.domain,o.organization_id) THEN RAISE EXCEPTION 'Scoped administrator required'; END IF;
 INSERT INTO public.enrollments(user_id,offering_id,role,status,completed_at)
 VALUES(p_user,p_offering,p_role,p_status,CASE WHEN p_status='completed' THEN now() END)
 ON CONFLICT(user_id,offering_id) DO UPDATE SET role=excluded.role,status=excluded.status,completed_at=excluded.completed_at;
 PERFORM private.audit('assign_enrollment','offering',p_offering,p_offering,jsonb_build_object('user_id',p_user,'role',p_role,'status',p_status));
END $$;
-- Public discovery returns only published MOOC metadata, not learning resources or payment records.
CREATE FUNCTION public.public_mooc_catalog() RETURNS TABLE(id uuid,title text,description text,code text,domain text,is_paid boolean,pacing text,start_date date,end_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT id,title,description,code,domain,is_paid,pacing,start_date,end_date FROM public.offerings WHERE domain='mooc' AND is_public AND is_published;
$$;
-- Verification reveals only public certificate facts for an exact, unguessable token.
CREATE FUNCTION public.verify_certificate(p_code text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('certificate_number',c.certificate_number,'status',c.status,'issued_at',c.issued_at,'course',o.title,'display_name',p.display_name)
 FROM public.certificates c JOIN public.offerings o ON o.id=c.offering_id JOIN public.profiles p ON p.user_id=c.user_id
 WHERE c.verification_code=p_code AND length(p_code)>=16;
$$;
-- No quiz mutation after an attempt starts: scoring uses an immutable assessment.
CREATE FUNCTION private.freeze_quiz() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.quiz_attempts WHERE quiz_id=OLD.id) THEN RAISE EXCEPTION 'Quiz has attempts; create a new assessment revision'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_started_quiz BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION private.freeze_quiz();
CREATE FUNCTION public.save_question(p_quiz uuid,p_id uuid,p_text text,p_type text,p_points numeric,p_options jsonb,p_key jsonb,p_order integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE qid uuid;
BEGIN
 PERFORM 1 FROM public.quizzes WHERE id=p_quiz FOR UPDATE;
 IF NOT FOUND OR NOT private.manage_offering(private.quiz_offering(p_quiz)) THEN RAISE EXCEPTION 'Assigned instructor required'; END IF;
 IF EXISTS(SELECT 1 FROM public.quiz_attempts WHERE quiz_id=p_quiz) THEN RAISE EXCEPTION 'Quiz has attempts; create a new assessment revision'; END IF;
 IF p_type NOT IN ('multiple_choice','true_false','short_answer','essay') OR length(trim(p_text))=0 THEN RAISE EXCEPTION 'Unsupported question'; END IF;
 IF p_type<>'essay' AND coalesce(p_key->>'correct','')='' THEN RAISE EXCEPTION 'Answer key required'; END IF;
 qid:=coalesce(p_id,gen_random_uuid());
 IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.questions WHERE id=p_id AND quiz_id=p_quiz) THEN RAISE EXCEPTION 'Question outside quiz'; END IF;
 INSERT INTO public.questions(id,quiz_id,question_text,question_type,points,options,order_index) VALUES(qid,p_quiz,p_text,p_type,p_points,p_options,p_order)
 ON CONFLICT(id) DO UPDATE SET question_text=excluded.question_text,question_type=excluded.question_type,points=excluded.points,options=excluded.options,order_index=excluded.order_index;
 INSERT INTO private.question_keys(question_id,correct_answer) VALUES(qid,p_key) ON CONFLICT(question_id) DO UPDATE SET correct_answer=excluded.correct_answer;
 UPDATE public.quizzes SET total_points=(SELECT sum(points) FROM public.questions WHERE quiz_id=p_quiz) WHERE id=p_quiz;
 RETURN qid;
END $$;
REVOKE ALL ON FUNCTION private.freeze_quiz() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_assignment_extension(uuid,uuid,timestamptz),public.record_attendance(uuid,uuid,text),public.assign_membership(uuid,text,text,uuid),public.assign_enrollment(uuid,uuid,text,text),public.save_question(uuid,uuid,text,text,numeric,jsonb,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_assignment_extension(uuid,uuid,timestamptz),public.record_attendance(uuid,uuid,text),public.assign_membership(uuid,text,text,uuid),public.assign_enrollment(uuid,uuid,text,text),public.save_question(uuid,uuid,text,text,numeric,jsonb,jsonb,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.public_mooc_catalog(),public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_mooc_catalog(),public.verify_certificate(text) TO anon,authenticated;
