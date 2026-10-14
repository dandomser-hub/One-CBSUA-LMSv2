// Run only against a disposable Supabase project after applying all migrations.
import { createClient } from '@supabase/supabase-js'
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  VLP_DEMO_PASSWORD = process.env.VITE_DEMO_PASSWORD || 'Password123!',
  VLP_ALLOW_DEMO_SEED,
} = process.env
if (
  VLP_ALLOW_DEMO_SEED !== 'yes' ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !SUPABASE_ANON_KEY ||
  !VLP_DEMO_PASSWORD ||
  VLP_DEMO_PASSWORD.length < 12
) {
  throw new Error(
    'Use a disposable project and set VLP_ALLOW_DEMO_SEED=yes, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY and VLP_DEMO_PASSWORD (12+ characters).',
  )
}
if (process.env.VITE_DEMO_PASSWORD && process.env.VITE_DEMO_PASSWORD !== VLP_DEMO_PASSWORD) {
  throw new Error('VITE_DEMO_PASSWORD and VLP_DEMO_PASSWORD must match for the demo shortcuts.')
}
const resetPasswords = process.argv.includes('--reset-passwords')
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (promise) => {
  const { data, error } = await promise
  if (error) throw error
  return data
}
const identities = [
  'admin',
  'faculty',
  'student',
  'student2',
  'facilitator',
  'employee',
  'mooc',
  'multirole',
]
const users = {}
// Password resets are restricted to these exact synthetic identities and require --reset-passwords.
const existing = []
for (let page = 1; ; page++) {
  const result = await must(admin.auth.admin.listUsers({ page, perPage: 100 }))
  existing.push(...result.users)
  if (result.users.length < 100) break
}
for (const name of identities) {
  const email = `${name}@vlpv2.test`
  const existingUser = existing.find((u) => u.email === email)
  if (existingUser && resetPasswords) {
    await must(
      admin.auth.admin.updateUserById(existingUser.id, {
        password: VLP_DEMO_PASSWORD,
        email_confirm: true,
      }),
    )
  }
  users[name] =
    existingUser?.id ||
    (
      await must(
        admin.auth.admin.createUser({
          email,
          password: VLP_DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: `Demo ${name}` },
        }),
      )
    ).user.id
}
// Verify every account through the same password authentication used by the app.
const verifier = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
for (const name of identities) {
  const { error } = await verifier.auth.signInWithPassword({
    email: name + '@vlpv2.test',
    password: VLP_DEMO_PASSWORD,
  })
  if (error)
    throw new Error(
      'Demo sign-in failed for ' +
        name +
        '@vlpv2.test. Check the connected project and run npm run repair:demo to synchronize passwords.',
    )
  await verifier.auth.signOut()
}
console.log('All eight synthetic demo accounts passed password authentication.')
const id = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`
await must(
  admin
    .from('organizations')
    .upsert({ id: id(1), name: 'Demo Campus', code: 'DEMO', type: 'campus' }),
)
const memberships = [
  ...['academic', 'lnd', 'mooc'].map((domain) => ({
    user_id: users.admin,
    domain,
    role: 'admin',
    organization_id: null,
  })),
  ...[
    ['faculty', 'academic', 'faculty'],
    ['student', 'academic', 'student'],
    ['student2', 'academic', 'student'],
    ['facilitator', 'lnd', 'facilitator'],
    ['employee', 'lnd', 'learner'],
    ['mooc', 'mooc', 'mooc_learner'],
    ['multirole', 'academic', 'faculty'],
    ['multirole', 'academic', 'student'],
    ['multirole', 'lnd', 'learner'],
  ].map(([u, domain, role]) => ({ user_id: users[u], domain, role, organization_id: id(1) })),
]
await must(
  admin.from('domain_memberships').upsert(memberships, { onConflict: 'user_id,domain,role' }),
)
await must(
  admin.from('offerings').upsert([
    {
      id: id(10),
      title: 'Demo Agricultural Economics',
      domain: 'academic',
      created_by: users.faculty,
      organization_id: id(1),
      is_published: true,
      is_public: false,
      is_paid: false,
    },
    {
      id: id(11),
      title: 'Demo Employee Development',
      domain: 'lnd',
      created_by: users.facilitator,
      organization_id: id(1),
      is_published: true,
      is_public: false,
      is_paid: false,
    },
    {
      id: id(12),
      title: 'Demo Open Agriculture',
      domain: 'mooc',
      created_by: users.admin,
      organization_id: id(1),
      is_published: true,
      is_public: true,
      is_paid: false,
      pacing: 'self_paced',
    },
    {
      id: id(13),
      title: 'Demo Paid Agriculture',
      domain: 'mooc',
      created_by: users.admin,
      organization_id: id(1),
      is_published: true,
      is_public: true,
      is_paid: true,
      pacing: 'self_paced',
    },
  ]),
)
await must(
  admin.from('enrollments').upsert(
    [
      ...['student', 'student2', 'multirole'].map((u) => ({
        user_id: users[u],
        offering_id: id(10),
        role: 'student',
        status: 'active',
      })),
      ...['employee', 'multirole'].map((u) => ({
        user_id: users[u],
        offering_id: id(11),
        role: 'learner',
        status: 'active',
      })),
      { user_id: users.faculty, offering_id: id(10), role: 'faculty', status: 'active' },
      { user_id: users.facilitator, offering_id: id(11), role: 'facilitator', status: 'active' },
      { user_id: users.mooc, offering_id: id(12), role: 'learner', status: 'active' },
    ],
    { onConflict: 'user_id,offering_id' },
  ),
)
await must(
  admin.from('lessons').upsert({
    id: id(20),
    offering_id: id(10),
    title: 'Supply and demand',
    content:
      'A synthetic learning resource for testing. Read the material, then take the quiz and submit your assignment.',
    is_published: true,
  }),
)
await must(
  admin.from('assignments').upsert({
    id: id(21),
    offering_id: id(10),
    title: 'Demo Article Review',
    max_points: 10,
    is_published: true,
    allow_resubmission: true,
  }),
)
const instructor = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
await must(
  instructor.auth.signInWithPassword({ email: 'faculty@vlpv2.test', password: VLP_DEMO_PASSWORD }),
)
const existingQuiz = await must(admin.from('quizzes').select('id').eq('id', id(22)).maybeSingle())
if (!existingQuiz) {
  await must(
    admin.from('quizzes').insert({
      id: id(22),
      offering_id: id(10),
      title: 'Demo Quiz',
      is_published: false,
      max_attempts: 2,
      time_limit_minutes: 10,
      feedback_release: 'manual',
    }),
  )
  await must(
    instructor.rpc('save_question', {
      p_quiz: id(22),
      p_id: null,
      p_text: 'Which term describes the amount offered for sale?',
      p_type: 'short_answer',
      p_points: 5,
      p_options: null,
      p_key: { correct: 'supply' },
      p_order: 1,
    }),
  )
  await must(
    instructor.rpc('save_question', {
      p_quiz: id(22),
      p_id: null,
      p_text: 'Explain one factor affecting demand.',
      p_type: 'essay',
      p_points: 5,
      p_options: null,
      p_key: null,
      p_order: 2,
    }),
  )
  await must(admin.from('quizzes').update({ is_published: true }).eq('id', id(22)))
}
await must(
  admin.from('attendance_sessions').upsert({
    id: id(23),
    offering_id: id(10),
    session_date: '2026-10-14',
    created_by: users.faculty,
  }),
)
await must(
  admin.from('competencies').upsert({
    id: id(24),
    offering_id: id(11),
    name: 'Service improvement',
    description: 'Demo competency for viewing progress.',
  }),
)
await must(
  admin.from('learner_competencies').upsert(
    {
      competency_id: id(24),
      user_id: users.employee,
      is_met: true,
      met_at: new Date().toISOString(),
    },
    { onConflict: 'competency_id,user_id' },
  ),
)
await must(
  admin.from('certificates').upsert(
    {
      id: id(25),
      offering_id: id(12),
      user_id: users.mooc,
      certificate_number: 'DEMO-001',
      verification_code: 'demo-certificate-verification-001',
    },
    { onConflict: 'id' },
  ),
)
await must(
  admin.from('integration_log').upsert({
    id: id(26),
    source_system: 'fmis',
    action: 'DEMO ONLY — adapter not connected',
    status: 'pending',
    source_batch_id: 'demo-fmis-001',
    records_processed: 0,
    error_detail: 'Synthetic fixture; no live payment processing.',
  }),
)
await instructor.auth.signOut()
console.log(
  'Synthetic demo fixtures created. Sign in with the configured demo password. No credentials were printed.',
)
