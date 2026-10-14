-- Critical repair: deny direct writes to identities, enrollments and assessment results.
-- Apply as the database owner. No service-role credentials belong in the frontend.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('organizations','profiles','domain_memberships','offerings','enrollments','lessons','quizzes','questions','quiz_attempts','quiz_answers','assignments','submissions','grades','attendance_sessions','attendance_records','notifications','audit_log','integration_log','competencies','learner_competencies','certificates') LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
REVOKE ALL ON public.organizations, public.profiles, public.domain_memberships, public.offerings, public.enrollments, public.lessons, public.quizzes, public.questions, public.quiz_attempts, public.quiz_answers, public.assignments, public.submissions, public.grades, public.attendance_sessions, public.attendance_records, public.notifications, public.audit_log, public.integration_log, public.competencies, public.learner_competencies, public.certificates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organizations, public.profiles, public.domain_memberships, public.offerings, public.enrollments, public.lessons, public.quizzes, public.questions, public.assignments, public.grades, public.attendance_sessions, public.attendance_records, public.notifications, public.audit_log, public.integration_log, public.competencies, public.learner_competencies, public.certificates TO authenticated;
CREATE TABLE private.question_keys (
 question_id uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
 correct_answer jsonb, explanation text
);
INSERT INTO private.question_keys SELECT id,correct_answer,explanation FROM public.questions;
ALTER TABLE public.questions DROP COLUMN correct_answer, DROP COLUMN explanation;
REVOKE ALL ON private.question_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,quiz_id,user_id,attempt_number,status,started_at,submitted_at,max_score,autosave_state,created_at) ON public.quiz_attempts TO authenticated;
GRANT SELECT (id,attempt_id,question_id,answer_data,saved_at) ON public.quiz_answers TO authenticated;
-- Submission rows (including marking fields) are returned only through the release-aware RPC.
ALTER TABLE public.assignments ADD COLUMN allow_late boolean NOT NULL DEFAULT false;
CREATE TABLE public.assignment_extensions (
 assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 due_at timestamptz NOT NULL,
 PRIMARY KEY(assignment_id,user_id)
);
ALTER TABLE public.assignment_extensions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.assignment_extensions TO authenticated;
-- Preserve previously granted extensions when upgrading.
INSERT INTO public.assignment_extensions SELECT assignment_id,user_id,max(extension_due_date)
 FROM public.submissions WHERE extension_due_date IS NOT NULL GROUP BY assignment_id,user_id;

CREATE FUNCTION private.quiz_offering(qid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT offering_id FROM public.quizzes WHERE id=qid;
$$;
CREATE FUNCTION private.assignment_offering(aid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT offering_id FROM public.assignments WHERE id=aid;
$$;
CREATE FUNCTION private.session_offering(sid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT offering_id FROM public.attendance_sessions WHERE id=sid;
$$;
CREATE FUNCTION private.competency_offering(cid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT offering_id FROM public.competencies WHERE id=cid;
$$;
CREATE FUNCTION private.owns_attempt(aid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.quiz_attempts WHERE id=aid AND user_id=auth.uid());
$$;
CREATE FUNCTION private.manage_attempt(aid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.manage_offering(q.offering_id) FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id WHERE a.id=aid;
$$;
CREATE FUNCTION private.is_active_learner(oid uuid, uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE offering_id=oid AND user_id=uid AND status='active' AND role IN ('learner','student'));
$$;
CREATE FUNCTION private.platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(DISTINCT domain)=3 FROM public.domain_memberships WHERE user_id=auth.uid() AND role='admin' AND organization_id IS NULL;
$$;
CREATE FUNCTION private.can_read_profile(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT uid=auth.uid() OR EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=uid AND private.manage_offering(e.offering_id));
$$;
CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated USING (true) ;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (private.can_read_profile(user_id)) ;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid()) ;
GRANT UPDATE (display_name,avatar_url) ON public.profiles TO authenticated;
CREATE POLICY domain_memberships_select ON public.domain_memberships FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.domain_admin(domain,organization_id)) ;
CREATE POLICY offerings_select ON public.offerings FOR SELECT TO authenticated USING ((is_public AND is_published AND domain='mooc') OR private.read_offering(id)) ;
CREATE POLICY offerings_insert ON public.offerings FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND (private.domain_admin(domain,organization_id) OR private.can_teach(domain,organization_id))) ;
CREATE POLICY offerings_update ON public.offerings FOR UPDATE TO authenticated USING (private.manage_offering(id)) WITH CHECK (private.manage_offering(id)) ;
GRANT INSERT, UPDATE ON public.offerings TO authenticated;
CREATE POLICY enrollments_select ON public.enrollments FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(offering_id)) ;
CREATE POLICY lessons_select ON public.lessons FOR SELECT TO authenticated USING (private.manage_offering(offering_id) OR (is_published AND private.learn_offering(offering_id))) ;
CREATE POLICY lessons_insert ON public.lessons FOR INSERT TO authenticated WITH CHECK (private.manage_offering(offering_id)) ;
CREATE POLICY lessons_update ON public.lessons FOR UPDATE TO authenticated USING (private.manage_offering(offering_id)) WITH CHECK (private.manage_offering(offering_id)) ;
GRANT INSERT, UPDATE ON public.lessons TO authenticated;
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT TO authenticated USING (private.manage_offering(offering_id) OR (is_published AND private.learn_offering(offering_id))) ;
CREATE POLICY quizzes_insert ON public.quizzes FOR INSERT TO authenticated WITH CHECK (private.manage_offering(offering_id)) ;
CREATE POLICY quizzes_update ON public.quizzes FOR UPDATE TO authenticated USING (private.manage_offering(offering_id)) WITH CHECK (private.manage_offering(offering_id)) ;
GRANT INSERT, UPDATE ON public.quizzes TO authenticated;
CREATE POLICY assignments_select ON public.assignments FOR SELECT TO authenticated USING (private.manage_offering(offering_id) OR (is_published AND private.learn_offering(offering_id))) ;
CREATE POLICY assignments_insert ON public.assignments FOR INSERT TO authenticated WITH CHECK (private.manage_offering(offering_id)) ;
CREATE POLICY assignments_update ON public.assignments FOR UPDATE TO authenticated USING (private.manage_offering(offering_id)) WITH CHECK (private.manage_offering(offering_id)) ;
GRANT INSERT, UPDATE ON public.assignments TO authenticated;
CREATE POLICY questions_select ON public.questions FOR SELECT TO authenticated USING (private.manage_offering(private.quiz_offering(quiz_id)) OR EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND q.is_published AND private.learn_offering(q.offering_id) AND (q.open_at IS NULL OR now()>=q.open_at))) ;
CREATE POLICY quiz_attempts_select ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(private.quiz_offering(quiz_id))) ;
CREATE POLICY quiz_answers_select ON public.quiz_answers FOR SELECT TO authenticated USING (private.owns_attempt(attempt_id) OR private.manage_attempt(attempt_id)) ;
CREATE POLICY grades_select ON public.grades FOR SELECT TO authenticated USING ((user_id=auth.uid() AND is_released) OR private.manage_offering(offering_id)) ;
CREATE POLICY assignment_extensions_select ON public.assignment_extensions FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(private.assignment_offering(assignment_id))) ;
CREATE POLICY attendance_sessions_select ON public.attendance_sessions FOR SELECT TO authenticated USING (private.read_offering(offering_id)) ;
CREATE POLICY attendance_sessions_insert ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (private.manage_offering(offering_id) AND created_by=auth.uid()) ;
GRANT INSERT ON public.attendance_sessions TO authenticated;
CREATE POLICY attendance_records_select ON public.attendance_records FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(private.session_offering(session_id))) ;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (user_id=auth.uid()) ;
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid()) ;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT TO authenticated USING (actor_id=auth.uid() OR private.platform_admin()) ;
CREATE POLICY integration_log_select ON public.integration_log FOR SELECT TO authenticated USING (private.platform_admin()) ;
CREATE POLICY competencies_select ON public.competencies FOR SELECT TO authenticated USING (private.read_offering(offering_id)) ;
CREATE POLICY learner_competencies_select ON public.learner_competencies FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(private.competency_offering(competency_id))) ;
CREATE POLICY certificates_select ON public.certificates FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.manage_offering(offering_id)) ;

-- Prevent managers from moving records into another domain/course or changing ownership.
CREATE FUNCTION private.immutable_scope() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='offerings' THEN
  IF NEW.domain IS DISTINCT FROM OLD.domain OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
   RAISE EXCEPTION 'Offering scope and owner are immutable'; END IF;
 ELSE
  IF NEW.offering_id IS DISTINCT FROM OLD.offering_id THEN RAISE EXCEPTION 'Course scope is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_offering BEFORE UPDATE ON public.offerings FOR EACH ROW EXECUTE FUNCTION private.immutable_scope();
CREATE TRIGGER immutable_lesson BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION private.immutable_scope();
CREATE TRIGGER immutable_quiz BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION private.immutable_scope();
CREATE TRIGGER immutable_assignment BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION private.immutable_scope();

CREATE FUNCTION private.audit(action_name text,kind text,eid uuid,oid uuid,details jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,domain,after_value)
 SELECT auth.uid(),action_name,kind,eid,o.domain,details FROM public.offerings o WHERE o.id=oid;
$$;

CREATE FUNCTION public.my_offerings() RETURNS TABLE(offering jsonb, can_manage boolean, learner boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT to_jsonb(o),private.manage_offering(o.id),private.is_active_learner(o.id,auth.uid())
 FROM public.offerings o WHERE auth.uid() IS NOT NULL AND private.read_offering(o.id);
$$;
CREATE FUNCTION public.offering_access(p_offering uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('can_manage',private.manage_offering(p_offering),'learner',private.is_active_learner(p_offering,auth.uid()));
$$;

CREATE FUNCTION public.enroll_free_mooc(p_offering uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.offerings; eid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO o FROM public.offerings WHERE id=p_offering FOR SHARE;
 IF NOT FOUND OR o.domain<>'mooc' OR NOT o.is_public OR NOT o.is_published OR o.is_paid
 OR (o.start_date IS NOT NULL AND current_date<o.start_date) OR (o.end_date IS NOT NULL AND current_date>o.end_date) THEN
 RAISE EXCEPTION 'This offering is not open for free self-enrollment'; END IF;
 INSERT INTO public.domain_memberships(user_id,domain,role,organization_id) VALUES(auth.uid(),'mooc','mooc_learner',o.organization_id) ON CONFLICT DO NOTHING;
 INSERT INTO public.enrollments(user_id,offering_id,role,status) VALUES(auth.uid(),o.id,'learner','active')
 ON CONFLICT(user_id,offering_id) DO NOTHING RETURNING id INTO eid;
 IF eid IS NULL THEN
  SELECT id INTO eid FROM public.enrollments WHERE user_id=auth.uid() AND offering_id=o.id AND status IN ('active','completed');
  IF eid IS NULL THEN RAISE EXCEPTION 'Existing enrollment requires administrator review'; END IF;
 ELSE PERFORM private.audit('enroll_free_mooc','enrollment',eid,o.id,'{}'); END IF;
 RETURN eid;
END $$;

-- Account provisioning never trusts role fields in user metadata.
CREATE FUNCTION private.provision_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(user_id,display_name,email)
 VALUES(NEW.id,coalesce(nullif(NEW.raw_user_meta_data->>'display_name',''),'Learner'),NEW.email)
 ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER provision_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.provision_profile();
INSERT INTO public.profiles(user_id,display_name,email)
 SELECT id,coalesce(nullif(raw_user_meta_data->>'display_name',''),'Learner'),email FROM auth.users
 ON CONFLICT(user_id) DO NOTHING;

CREATE FUNCTION private.check_answers(qid uuid, answers jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; v jsonb; q public.questions;
BEGIN
 IF answers IS NULL OR jsonb_typeof(answers)<>'object' THEN RAISE EXCEPTION 'Answers must be an object'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(answers) LOOP
  SELECT * INTO q FROM public.questions WHERE id=k::uuid AND quiz_id=qid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Question does not belong to this quiz'; END IF;
  IF jsonb_typeof(v)<>'string' OR length(v#>>'{}')>20000 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  IF q.question_type='multiple_choice' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q.options) x WHERE x->>'id'=v#>>'{}') THEN RAISE EXCEPTION 'Invalid option'; END IF;
  IF q.question_type='true_false' AND v#>>'{}' NOT IN ('true','false') THEN RAISE EXCEPTION 'Invalid true/false answer'; END IF;
 END LOOP;
END $$;
CREATE FUNCTION private.quiz_deadline(a public.quiz_attempts,q public.quizzes) RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT least(q.close_at,CASE WHEN q.time_limit_minutes IS NOT NULL THEN a.started_at+q.time_limit_minutes*interval '1 minute' END);
$$;
CREATE FUNCTION public.start_quiz(p_quiz uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.quizzes; a public.quiz_attempts; n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_quiz::text,0));
 SELECT * INTO q FROM public.quizzes WHERE id=p_quiz FOR SHARE;
 IF NOT FOUND OR NOT q.is_published OR NOT private.learn_offering(q.offering_id) OR NOT private.is_active_learner(q.offering_id,auth.uid()) THEN RAISE EXCEPTION 'Active learner enrollment required'; END IF;
 SELECT * INTO a FROM public.quiz_attempts WHERE quiz_id=p_quiz AND user_id=auth.uid() AND status='in_progress' ORDER BY attempt_number DESC LIMIT 1;
 IF NOT FOUND THEN
  IF (q.open_at IS NOT NULL AND now()<q.open_at) OR (q.close_at IS NOT NULL AND now()>=q.close_at) THEN RAISE EXCEPTION 'Quiz is outside its availability window'; END IF;
  SELECT count(*) INTO n FROM public.quiz_attempts WHERE quiz_id=p_quiz AND user_id=auth.uid();
  IF n>=q.max_attempts THEN RAISE EXCEPTION 'Maximum attempts reached'; END IF;
  INSERT INTO public.quiz_attempts(quiz_id,user_id,attempt_number,max_score,autosave_state)
  VALUES(p_quiz,auth.uid(),n+1,(SELECT coalesce(sum(points),0) FROM public.questions WHERE quiz_id=p_quiz),'{}') RETURNING * INTO a;
 END IF;
 RETURN (to_jsonb(a)-'score')||jsonb_build_object('deadline',private.quiz_deadline(a,q),'server_now',clock_timestamp());
END $$;
CREATE FUNCTION public.save_quiz_answers(p_attempt uuid,p_answers jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.quiz_attempts; q public.quizzes;
BEGIN
 SELECT * INTO a FROM public.quiz_attempts WHERE id=p_attempt AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status<>'in_progress' THEN RAISE EXCEPTION 'Attempt is not editable'; END IF;
 SELECT * INTO q FROM public.quizzes WHERE id=a.quiz_id;
 IF NOT private.is_active_learner(q.offering_id,auth.uid()) OR NOT private.learn_offering(q.offering_id) THEN RAISE EXCEPTION 'Active enrollment required'; END IF;
 IF clock_timestamp()>=private.quiz_deadline(a,q) THEN RAISE EXCEPTION 'Quiz deadline passed'; END IF;
 PERFORM private.check_answers(q.id,p_answers);
 UPDATE public.quiz_attempts SET autosave_state=p_answers WHERE id=a.id;
 INSERT INTO public.quiz_answers(attempt_id,question_id,answer_data) SELECT a.id,key::uuid,value FROM jsonb_each(p_answers)
 ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer_data=excluded.answer_data,saved_at=now();
END $$;
CREATE FUNCTION public.submit_quiz(p_attempt uuid,p_answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.quiz_attempts; q public.quizzes; question record; accepted jsonb; pts numeric; total numeric:=0; maximum numeric:=0; pending boolean:=false; expired boolean;
BEGIN
 SELECT * INTO a FROM public.quiz_attempts WHERE id=p_attempt AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
 SELECT * INTO q FROM public.quizzes WHERE id=a.quiz_id;
 IF a.status IN ('submitted','graded') THEN RETURN jsonb_build_object('id',a.id,'status',a.status,'duplicate',true); END IF;
 IF a.status<>'in_progress' OR NOT private.is_active_learner(q.offering_id,auth.uid()) OR NOT private.learn_offering(q.offering_id) THEN RAISE EXCEPTION 'Attempt cannot be submitted'; END IF;
 expired:=coalesce(clock_timestamp()>=private.quiz_deadline(a,q),false);
 accepted:=CASE WHEN expired THEN coalesce(a.autosave_state,'{}') ELSE p_answers END;
 PERFORM private.check_answers(q.id,accepted);
 FOR question IN SELECT z.*,k.correct_answer FROM public.questions z LEFT JOIN private.question_keys k ON k.question_id=z.id WHERE z.quiz_id=q.id LOOP
  pts:=0; maximum:=maximum+question.points;
  IF question.question_type='essay' OR question.correct_answer IS NULL THEN pending:=true;
  ELSIF lower(trim(accepted->>question.id::text))=lower(trim(question.correct_answer->>'correct')) THEN pts:=question.points; END IF;
  total:=total+pts;
  INSERT INTO public.quiz_answers(attempt_id,question_id,answer_data,is_correct,points_awarded)
   VALUES(a.id,question.id,accepted->question.id::text,CASE WHEN question.question_type='essay' OR question.correct_answer IS NULL THEN NULL ELSE pts=question.points END,pts)
   ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer_data=excluded.answer_data,is_correct=excluded.is_correct,points_awarded=excluded.points_awarded,saved_at=now();
 END LOOP;
 UPDATE public.quiz_attempts SET status=CASE WHEN pending THEN 'submitted' ELSE 'graded' END,score=total,max_score=maximum,submitted_at=now(),autosave_state=accepted WHERE id=a.id;
 INSERT INTO public.grades(offering_id,user_id,item_name,item_type,item_id,score,max_score,is_released)
 VALUES(q.offering_id,auth.uid(),q.title||' — attempt '||a.attempt_number,'quiz',a.id,total,maximum,NOT pending AND q.feedback_release='immediate');
 PERFORM private.audit('submit_quiz','quiz_attempt',a.id,q.offering_id,jsonb_build_object('expired',expired,'pending_marking',pending));
 RETURN jsonb_build_object('id',a.id,'status',CASE WHEN pending THEN 'submitted' ELSE 'graded' END,'expired',expired);
END $$;

CREATE FUNCTION public.submit_assignment(p_assignment uuid,p_content text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.assignments; previous public.submissions; due timestamptz; sid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_assignment::text,0));
 SELECT * INTO a FROM public.assignments WHERE id=p_assignment;
 IF NOT FOUND OR NOT a.is_published OR NOT private.learn_offering(a.offering_id) OR NOT private.is_active_learner(a.offering_id,auth.uid()) THEN RAISE EXCEPTION 'Active learner enrollment required'; END IF;
 IF p_content IS NULL OR length(trim(p_content))=0 OR length(p_content)>100000 THEN RAISE EXCEPTION 'Submission must contain 1–100000 characters'; END IF;
 SELECT * INTO previous FROM public.submissions WHERE assignment_id=a.id AND user_id=auth.uid() ORDER BY submitted_at DESC,id DESC LIMIT 1;
 IF FOUND AND NOT a.allow_resubmission THEN RAISE EXCEPTION 'Resubmission is not allowed'; END IF;
 SELECT due_at INTO due FROM public.assignment_extensions WHERE assignment_id=a.id AND user_id=auth.uid();
 due:=coalesce(due,a.due_date);
 IF due IS NOT NULL AND now()>due AND NOT a.allow_late THEN RAISE EXCEPTION 'Deadline passed; request an extension'; END IF;
 INSERT INTO public.submissions(assignment_id,user_id,content,status,prior_submission_id)
 VALUES(a.id,auth.uid(),p_content,CASE WHEN now()>due THEN 'late' WHEN previous.id IS NOT NULL THEN 'resubmitted' ELSE 'submitted' END,previous.id) RETURNING id INTO sid;
 PERFORM private.audit('submit_assignment','submission',sid,a.offering_id,jsonb_build_object('prior_submission_id',previous.id));
 RETURN sid;
END $$;
CREATE FUNCTION public.list_submissions(p_assignment uuid) RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (to_jsonb(s)-'grade'-'feedback'-'graded_by'-'graded_at')||jsonb_build_object(
 'status',CASE WHEN s.status='graded' AND NOT private.manage_offering(a.offering_id) AND NOT coalesce(g.is_released,false) THEN 'submitted' ELSE s.status END,
 'grade',CASE WHEN private.manage_offering(a.offering_id) OR g.is_released THEN g.score END,
 'feedback',CASE WHEN private.manage_offering(a.offering_id) OR g.is_released THEN s.feedback END,
 'graded_at',CASE WHEN private.manage_offering(a.offering_id) OR g.is_released THEN s.graded_at END,
 'graded_by',CASE WHEN private.manage_offering(a.offering_id) OR g.is_released THEN s.graded_by END,
 'display_name',p.display_name,'is_released',coalesce(g.is_released,false))
 FROM public.submissions s JOIN public.assignments a ON a.id=s.assignment_id
 LEFT JOIN public.profiles p ON p.user_id=s.user_id
 LEFT JOIN public.grades g ON g.item_type='assignment' AND g.item_id=s.id AND g.user_id=s.user_id
 WHERE s.assignment_id=p_assignment AND (s.user_id=auth.uid() OR private.manage_offering(a.offering_id))
 ORDER BY s.submitted_at DESC,s.id DESC;
$$;
CREATE FUNCTION public.grade_submission(p_submission uuid,p_score numeric,p_feedback text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.submissions; a public.assignments;
BEGIN
 SELECT * INTO s FROM public.submissions WHERE id=p_submission FOR UPDATE;
 SELECT * INTO a FROM public.assignments WHERE id=s.assignment_id;
 IF NOT FOUND OR NOT private.manage_offering(a.offering_id) THEN RAISE EXCEPTION 'Assigned instructor required'; END IF;
 IF p_score IS NULL OR p_score<0 OR p_score>a.max_points OR p_score::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Score out of range'; END IF;
 UPDATE public.submissions SET grade=p_score,feedback=p_feedback,graded_by=auth.uid(),graded_at=now(),status='graded' WHERE id=s.id;
 DELETE FROM public.grades WHERE item_type='assignment' AND item_id=s.id AND user_id=s.user_id;
 INSERT INTO public.grades(offering_id,user_id,item_name,item_type,item_id,score,max_score,is_released,graded_by)
 VALUES(a.offering_id,s.user_id,a.title||' — '||s.submitted_at::text,'assignment',s.id,p_score,a.max_points,false,auth.uid());
 PERFORM private.audit('grade_submission','submission',s.id,a.offering_id,jsonb_build_object('score',p_score));
END $$;
CREATE FUNCTION public.release_grade(p_grade uuid,p_released boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.grades;
BEGIN
 SELECT * INTO g FROM public.grades WHERE id=p_grade FOR UPDATE;
 IF NOT FOUND OR NOT private.manage_offering(g.offering_id) THEN RAISE EXCEPTION 'Assigned instructor required'; END IF;
 IF p_released AND g.item_type='quiz' AND EXISTS(SELECT 1 FROM public.quiz_answers WHERE attempt_id=g.item_id AND is_correct IS NULL) THEN RAISE EXCEPTION 'Complete manual marking before release'; END IF;
 UPDATE public.grades SET is_released=p_released WHERE id=g.id;
 PERFORM private.audit('release_grade','grade',g.id,g.offering_id,jsonb_build_object('released',p_released));
END $$;
CREATE FUNCTION public.quiz_results(p_quiz uuid) RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.manage_offering(private.quiz_offering(p_quiz)) THEN RAISE EXCEPTION 'Assigned instructor required'; END IF;
 RETURN QUERY SELECT to_jsonb(a)||jsonb_build_object('display_name',p.display_name,'answers',coalesce((SELECT jsonb_agg(to_jsonb(ans)||jsonb_build_object('question_text',q.question_text,'points',q.points)) FROM public.quiz_answers ans JOIN public.questions q ON q.id=ans.question_id WHERE ans.attempt_id=a.id),'[]'::jsonb))
 FROM public.quiz_attempts a LEFT JOIN public.profiles p ON p.user_id=a.user_id WHERE a.quiz_id=p_quiz ORDER BY a.started_at DESC;
END $$;
CREATE FUNCTION public.mark_quiz_answer(p_answer uuid,p_score numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ans public.quiz_answers; q public.questions; a public.quiz_attempts; total numeric;
BEGIN
 -- Lock the attempt first, serializing all grading and submission for that attempt.
 SELECT qa.* INTO a FROM public.quiz_attempts qa JOIN public.quiz_answers x ON x.attempt_id=qa.id WHERE x.id=p_answer FOR UPDATE OF qa;
 SELECT * INTO ans FROM public.quiz_answers WHERE id=p_answer;
 SELECT * INTO q FROM public.questions WHERE id=ans.question_id;
 IF NOT FOUND OR NOT private.manage_attempt(ans.attempt_id) OR a.status NOT IN ('submitted','graded') THEN RAISE EXCEPTION 'Submitted attempt and assigned instructor required'; END IF;
 IF p_score IS NULL OR p_score<0 OR p_score>q.points OR p_score::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Score out of range'; END IF;
 UPDATE public.quiz_answers SET points_awarded=p_score,is_correct=(p_score=q.points) WHERE id=ans.id;
 SELECT sum(points_awarded) INTO total FROM public.quiz_answers WHERE attempt_id=a.id;
 UPDATE public.quiz_attempts SET score=total,status=CASE WHEN EXISTS(SELECT 1 FROM public.quiz_answers WHERE attempt_id=a.id AND is_correct IS NULL) THEN 'submitted' ELSE 'graded' END WHERE id=a.id;
 UPDATE public.grades SET score=total,is_released=false,graded_by=auth.uid(),graded_at=now() WHERE item_type='quiz' AND item_id=a.id;
 PERFORM private.audit('mark_quiz_answer','quiz_answer',ans.id,private.quiz_offering(q.quiz_id),jsonb_build_object('score',p_score));
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
-- Only boolean/context helpers used by RLS need to be callable by authenticated clients.
GRANT EXECUTE ON FUNCTION private.domain_admin(text,uuid),private.can_teach(text,uuid),private.manage_offering(uuid),private.learn_offering(uuid),private.read_offering(uuid),private.quiz_offering(uuid),private.assignment_offering(uuid),private.session_offering(uuid),private.competency_offering(uuid),private.owns_attempt(uuid),private.manage_attempt(uuid),private.is_active_learner(uuid,uuid),private.platform_admin(),private.can_read_profile(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.my_offerings() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_offerings() TO authenticated;
REVOKE ALL ON FUNCTION public.offering_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.offering_access(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.enroll_free_mooc(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enroll_free_mooc(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.start_quiz(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_quiz(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_quiz_answers(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_quiz_answers(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_quiz(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_assignment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_assignment(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.list_submissions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_submissions(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.grade_submission(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grade_submission(uuid,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION public.release_grade(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_grade(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.quiz_results(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quiz_results(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_quiz_answer(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_quiz_answer(uuid,numeric) TO authenticated;
