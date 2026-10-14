import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { readdir, readFile } from 'node:fs/promises'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
test('migrations, RLS isolation and transactional learning workflows', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(`CREATE ROLE authenticated NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`)
  for (const f of (await readdir('supabase/migrations')).sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, 'utf8'))
  const as = async (n) => {
    await db.exec(
      `RESET ROLE; SET request.jwt.claim.sub='${n ? id(n) : ''}'; SET ROLE ${n ? 'authenticated' : 'anon'}`,
    )
  }
  const owner = () => db.exec('RESET ROLE')
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows
  const rpc = async (name, args = []) =>
    (
      await rows(
        `SELECT public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) AS result`,
        args,
      )
    )[0]?.result
  const denied = async (sql, args = []) => assert.rejects(db.query(sql, args))
  await db.exec(`INSERT INTO auth.users(id,email) SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@test.invalid' FROM generate_series(1,6) n;
 INSERT INTO organizations(id,name,code) VALUES('${id(90)}','Campus A','A'),('${id(91)}','Campus B','B');
 INSERT INTO domain_memberships(user_id,domain,role,organization_id) VALUES('${id(1)}','academic','admin','${id(90)}'),('${id(2)}','academic','faculty','${id(90)}'),('${id(4)}','lnd','facilitator','${id(90)}');
 INSERT INTO offerings(id,title,domain,organization_id,created_by,is_published,is_public,is_paid) VALUES
 ('${id(10)}','Academic A','academic','${id(90)}','${id(2)}',true,false,false),
 ('${id(11)}','L&D','lnd','${id(90)}','${id(4)}',true,false,false),
 ('${id(12)}','Paid MOOC','mooc','${id(90)}',null,true,true,true),
 ('${id(13)}','Free MOOC','mooc','${id(90)}',null,true,true,false),
 ('${id(14)}','Draft MOOC','mooc','${id(90)}',null,false,true,false),
 ('${id(15)}','Other campus','academic','${id(91)}',null,true,false,false);
 INSERT INTO enrollments(user_id,offering_id,role,status) VALUES('${id(3)}','${id(10)}','student','active'),('${id(2)}','${id(11)}','learner','active'),('${id(5)}','${id(10)}','faculty','active');
 INSERT INTO quizzes(id,offering_id,title,is_published,max_attempts,time_limit_minutes,total_points) VALUES('${id(20)}','${id(10)}','Quiz',true,2,10,5),('${id(21)}','${id(10)}','Expired',true,1,1,5),('${id(22)}','${id(10)}','Essay',true,1,10,5);
 INSERT INTO questions(id,quiz_id,question_text,question_type,points) VALUES('${id(30)}','${id(20)}','Short','short_answer',5),('${id(31)}','${id(21)}','Short','short_answer',5),('${id(32)}','${id(22)}','Essay','essay',5);
 INSERT INTO private.question_keys(question_id,correct_answer) VALUES('${id(30)}','{"correct":"supply"}'),('${id(31)}','{"correct":"supply"}');
 INSERT INTO assignments(id,offering_id,title,max_points,is_published,allow_resubmission) VALUES('${id(40)}','${id(10)}','Essay',10,true,false);
 INSERT INTO attendance_sessions(id,offering_id,session_date,created_by) VALUES('${id(50)}','${id(10)}','2026-10-01','${id(2)}'),('${id(51)}','${id(10)}','2026-10-02','${id(2)}');`)
  await t.test('reads do not recurse; domain and campus admins are scoped', async () => {
    await as(3)
    assert.equal((await rows('SELECT * FROM enrollments')).length, 1)
    assert.equal((await rows('SELECT * FROM offerings')).length, 3)
    await as(1)
    assert.equal(
      (await rows('SELECT * FROM offerings WHERE id IN ($1,$2)', [id(11), id(15)])).length,
      0,
    )
    await as(2)
    const courses = await rpc('my_offerings')
    assert.ok(courses)
    assert.equal(await rpc('offering_access', [id(11)]).then((x) => x.can_manage), false)
    await as(5)
    assert.equal((await rpc('offering_access', [id(10)])).can_manage, true)
  })
  await t.test('self-promotion, paid self-enrollment and enrollment tampering denied', async () => {
    await as(3)
    await denied("INSERT INTO domain_memberships(user_id,domain,role) VALUES($1,'mooc','admin')", [
      id(3),
    ])
    await denied(
      "INSERT INTO enrollments(user_id,offering_id,role,status) VALUES($1,$2,'faculty','completed')",
      [id(3), id(12)],
    )
    await denied("UPDATE enrollments SET role='faculty' WHERE user_id=$1", [id(3)])
    await assert.rejects(rpc('enroll_free_mooc', [id(12)]))
    await assert.rejects(rpc('assign_membership', [id(3), 'academic', 'admin', id(90)]))
    const eid = await rpc('enroll_free_mooc', [id(13)])
    assert.equal(await rpc('enroll_free_mooc', [id(13)]), eid)
    await assert.rejects(rpc('enroll_free_mooc', [id(14)]))
    await as(1)
    await assert.rejects(rpc('assign_membership', [id(3), 'lnd', 'admin', id(90)]))
    await assert.rejects(rpc('assign_enrollment', [id(15), id(3), 'faculty', 'active']))
  })
  await t.test('keys and grading columns are unavailable to learner clients', async () => {
    await as(3)
    const qs = await rows('SELECT * FROM questions WHERE quiz_id=$1', [id(20)])
    assert.equal(qs.length, 1)
    assert.ok(!('correct_answer' in qs[0]))
    await denied('SELECT * FROM private.question_keys')
    await denied('SELECT score FROM quiz_attempts')
    await denied('SELECT grade FROM submissions')
    await denied(
      "INSERT INTO grades(offering_id,user_id,item_name,score) VALUES($1,$2,'Forged',100)",
      [id(10), id(3)],
    )
  })
  let attempt
  await t.test(
    'final answers saved atomically; idempotent submit; exact answer scoring',
    async () => {
      await as(3)
      attempt = await rpc('start_quiz', [id(20)])
      assert.equal((await rpc('start_quiz', [id(20)])).id, attempt.id)
      await rpc('submit_quiz', [attempt.id, { [id(30)]: 'supply' }])
      const saved = await rows('SELECT answer_data FROM quiz_answers WHERE attempt_id=$1', [
        attempt.id,
      ])
      assert.equal(saved[0].answer_data, 'supply')
      assert.equal(
        (await rpc('submit_quiz', [attempt.id, { [id(30)]: 'tampered' }])).duplicate,
        true,
      )
      await denied('UPDATE quiz_attempts SET score=999 WHERE id=$1', [attempt.id])
      await assert.rejects(rpc('save_quiz_answers', [attempt.id, { [id(30)]: 'tampered' }]))
      assert.equal((await rows('SELECT * FROM grades')).length, 0)
      await owner()
      const gs = await rows('SELECT * FROM grades WHERE item_id=$1', [attempt.id])
      assert.equal(gs.length, 1)
      assert.equal(Number(gs[0].score), 5)
      await as(3)
      const a2 = await rpc('start_quiz', [id(20)])
      await rpc('submit_quiz', [a2.id, { [id(30)]: 'not supply' }])
      await owner()
      assert.equal(
        Number((await rows('SELECT score FROM quiz_attempts WHERE id=$1', [a2.id]))[0].score),
        0,
      )
      await as(3)
      await assert.rejects(rpc('start_quiz', [id(20)]))
    },
  )
  await t.test('expired attempt uses last server save; unrelated questions rejected', async () => {
    await as(3)
    const a = await rpc('start_quiz', [id(21)])
    await assert.rejects(rpc('save_quiz_answers', [a.id, { [id(30)]: 'supply' }]))
    await rpc('save_quiz_answers', [a.id, { [id(31)]: 'supply' }])
    await owner()
    await db.query("UPDATE quiz_attempts SET started_at=now()-interval '2 minutes' WHERE id=$1", [
      a.id,
    ])
    await as(3)
    assert.equal(
      (await rpc('submit_quiz', [a.id, { [id(31)]: 'changed after deadline' }])).expired,
      true,
    )
    assert.equal(
      (await rows('SELECT answer_data FROM quiz_answers WHERE attempt_id=$1', [a.id]))[0]
        .answer_data,
      'supply',
    )
  })
  await t.test('essay marking and release require assigned instructor', async () => {
    await as(3)
    const a = await rpc('start_quiz', [id(22)])
    await rpc('submit_quiz', [a.id, { [id(32)]: 'My essay' }])
    await as(5)
    const results = await rows('SELECT * FROM quiz_results($1)', [id(22)])
    assert.equal(results.length, 1)
    const result = Object.values(results[0])[0]
    const answer = result.answers[0]
    const g = (await rows('SELECT * FROM grades WHERE item_id=$1', [a.id]))[0]
    await assert.rejects(rpc('release_grade', [g.id, true]))
    await rpc('mark_quiz_answer', [answer.id, 4])
    await rpc('release_grade', [g.id, true])
    await as(3)
    assert.equal(Number((await rows('SELECT score FROM grades WHERE id=$1', [g.id]))[0].score), 4)
  })
  await t.test(
    'assignment release, score bounds, resubmission and extension enforced',
    async () => {
      await as(3)
      const sid = await rpc('submit_assignment', [id(40), 'My work'])
      await assert.rejects(rpc('submit_assignment', [id(40), 'Second version']))
      await assert.rejects(rpc('grade_submission', [sid, 10, 'Forged']))
      await as(5)
      await assert.rejects(rpc('grade_submission', [sid, 11, 'Too high']))
      await rpc('grade_submission', [sid, 8, 'Good'])
      const g = (await rows('SELECT * FROM grades WHERE item_id=$1', [sid]))[0]
      await as(3)
      let s = (await rows('SELECT * FROM list_submissions($1)', [id(40)])).map(
        (x) => Object.values(x)[0],
      )[0]
      assert.equal(s.grade, null)
      assert.equal(s.feedback, null)
      assert.notEqual(s.status, 'graded')
      await as(5)
      await rpc('release_grade', [g.id, true])
      await as(3)
      s = (await rows('SELECT * FROM list_submissions($1)', [id(40)])).map(
        (x) => Object.values(x)[0],
      )[0]
      assert.equal(s.grade, 8)
      await owner()
      await db.query(
        "UPDATE assignments SET allow_resubmission=true,due_date=now()-interval '1 day' WHERE id=$1",
        [id(40)],
      )
      await as(3)
      await assert.rejects(rpc('submit_assignment', [id(40), 'Late']))
      await as(5)
      await rpc('set_assignment_extension', [id(40), id(3), '2099-01-01T00:00:00Z'])
      await as(3)
      const newId = await rpc('submit_assignment', [id(40), 'Revised'])
      assert.notEqual(newId, sid)
      assert.equal((await rows('SELECT * FROM list_submissions($1)', [id(40)])).length, 2)
    },
  )
  await t.test('attendance writes are scoped to selected session and active learner', async () => {
    await as(5)
    await rpc('record_attendance', [id(50), id(3), 'present'])
    await rpc('record_attendance', [id(51), id(3), 'late'])
    await assert.rejects(rpc('record_attendance', [id(50), id(6), 'present']))
    await as(3)
    const records = await rows('SELECT * FROM attendance_records ORDER BY session_id')
    assert.deepEqual(
      records.map((x) => x.status),
      ['present', 'late'],
    )
    await assert.rejects(rpc('record_attendance', [id(50), id(3), 'excused']))
    await as(6)
    assert.equal((await rows('SELECT * FROM attendance_records')).length, 0)
  })
  await t.test(
    'profile joins and provisioning exist; unrelated profiles remain private',
    async () => {
      await as(3)
      assert.equal((await rows('SELECT * FROM profiles')).length, 1)
      await as(5)
      assert.ok((await rows('SELECT * FROM profiles WHERE user_id=$1', [id(3)])).length)
      await owner()
      assert.equal(
        (
          await rows(
            "SELECT * FROM pg_constraint WHERE conname IN ('enrollments_profile_fkey','submissions_profile_fkey','grades_profile_fkey','certificates_profile_fkey','audit_profile_fkey')",
          )
        ).length,
        5,
      )
    },
  )
  await t.test(
    'anonymous catalog exposes only published MOOCs; integration mutations blocked',
    async () => {
      await as(null)
      const catalog = await rows('SELECT * FROM public_mooc_catalog()')
      assert.deepEqual(catalog.map((x) => x.id).sort(), [id(12), id(13)])
      await assert.rejects(rpc('start_quiz', [id(20)]))
      await as(1)
      await denied(
        "INSERT INTO integration_log(source_system,action,status) VALUES('fmis','fake','success')",
      )
    },
  )
  await t.test('catalog repair restores a missing RPC and is safe to reapply', async () => {
    await owner()
    await db.exec('DROP FUNCTION public.public_mooc_catalog()')
    const repair = await readFile(
      'supabase/migrations/20261014130000_006_restore_public_catalog.sql',
      'utf8',
    )
    await db.exec(repair)
    await db.exec(repair)
    await as(null)
    assert.deepEqual((await rows('SELECT * FROM public_mooc_catalog()')).map((x) => x.id).sort(), [
      id(12),
      id(13),
    ])
    await denied('SELECT * FROM public.offerings')
    await as(3)
    assert.equal((await rows('SELECT * FROM public_mooc_catalog()')).length, 2)
  })
})
