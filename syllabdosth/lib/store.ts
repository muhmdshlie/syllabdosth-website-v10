import 'server-only';
/**
 * Demo-mode database: one in-memory array per table, seeded from lib/demo-data.ts.
 * Only used when Supabase keys are missing. Survives hot reloads, resets on server restart.
 */
import * as demo from './demo-data';


type Row = Record<string, any>;

const now = () => Date.now();
const iso = (hoursAgo: number) => new Date(now() - hoursAgo * 3600_000).toISOString();
const inDays = (d: number, hour = 11) => {
  const t = new Date(now() + d * 86400_000);
  t.setUTCHours(hour - 5, 30, 0, 0); // hh:00 IST
  return t.toISOString();
};

export const DEMO_PROFILES = [
  { id: 'demo-learner', full_name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98450 12345', role: 'learner', status: 'active', city: 'Bengaluru', created_at: iso(24 * 3) },
  { id: 'demo-professional', full_name: 'Ananya (Ananya Makeup Studio)', email: 'ananya@example.com', phone: '+91 98450 22222', role: 'professional', status: 'active', city: 'Bengaluru', created_at: iso(24 * 20) },
  { id: 'demo-faculty', full_name: 'Kavya S.', email: 'kavya@example.com', phone: '+91 98450 33333', role: 'faculty', status: 'active', city: 'Bengaluru', created_at: iso(24 * 40) },
  { id: 'demo-admin', full_name: 'Syllabdosth Admin', email: 'admin@syllabdosth.com', phone: null, role: 'admin', status: 'active', city: 'Bengaluru', created_at: iso(24 * 60) },
  { id: 'demo-learner-2', full_name: 'Rekha Nair', email: 'rekha@example.com', phone: '+91 97411 45678', role: 'learner', status: 'active', city: 'Mysuru', created_at: iso(30) },
  { id: 'demo-learner-3', full_name: 'Sana Khan', email: 'sana@example.com', phone: '+91 96860 11223', role: 'learner', status: 'active', city: 'Hubballi', created_at: iso(80) },
];

const seeds: Record<string, () => Row[]> = {
  profiles: () => DEMO_PROFILES.map((p) => ({ ...p })),
  categories: () => demo.categories.map((c, i) => ({ ...c, sort: i, image_url: null, description: '' })),
  faculty: () => demo.faculty.map((f) => ({ ...f, user_id: f.id === 'f-kavya' ? 'demo-faculty' : null, photo_url: null, email: null, phone: null, created_at: iso(24 * 90) })),
  courses: () => demo.courses.map((c, i) => ({ ...c, image_url: null, published: true, created_at: iso(24 * (60 - i)) })),
  services: () => demo.services.map((s, i) => ({ ...s, sort: i, image_url: null, published: true, created_at: iso(24 * 90) })),
  professionals: () => demo.professionals.map((p, i) => ({ ...p, user_id: i === 0 ? 'demo-professional' : null, photo_url: null, created_at: iso(24 * 90) })),
  blog_posts: () => demo.blogPosts.map((b) => ({ ...b, quote: b.quote ?? null, image_url: null, published: true, created_at: `${b.published_at}T06:00:00.000Z` })),
  bookings: () => [
    { id: 'bk-1001', service_id: 's-bridal-makeup', professional_id: 'p-ananya', customer_id: 'demo-learner', name: 'Priya Sharma', phone: '+91 98450 12345', preferred_date: '2026-11-14', preferred_time: '06:30', location: 'Jayanagar 4th Block, Bengaluru 560011', requirements: 'Reception look, HD base, 1 extra person (mother).', status: 'pending', price_from: 2500, notes: '', created_at: iso(3) },
    { id: 'bk-1002', service_id: 's-bridal-makeup', professional_id: 'p-ananya', customer_id: null, name: 'Sneha Rao', phone: '+91 99000 11122', preferred_date: '2026-10-22', preferred_time: '16:00', location: 'Whitefield, Bengaluru', requirements: 'Engagement look, soft glam.', status: 'confirmed', price_from: 2500, notes: '', created_at: iso(30) },
    { id: 'bk-1003', service_id: 's-saree-draping', professional_id: 'p-kavya', customer_id: 'demo-learner', name: 'Priya Sharma', phone: '+91 98450 12345', preferred_date: '2026-10-05', preferred_time: '09:00', location: 'Jayanagar, Bengaluru', requirements: 'Nivi drape, silk saree.', status: 'completed', price_from: 900, notes: '', created_at: iso(200) },
  ],
  group_enquiries: () => [
    { id: 'gr-2001', name: 'Rahul Menon', phone: '+91 98860 44556', email: 'rahul@acme.in', people: 25, preferred_date: '2026-12-06', event_type: 'Office wellness day — mehandi + nail art', location: 'Koramangala, Bengaluru', requirements: '2 artists, 4 hours.', status: 'new', notes: '', created_at: iso(5) },
  ],
  enrollments: () => [
    { id: 'en-3001', course_id: 'c-13', user_id: 'demo-learner', name: 'Priya Sharma', phone: '+91 98450 12345', email: 'priya@example.com', mode: 'Online', message: 'Weekend batch please.', status: 'converted', notes: 'Weekend batch, starts 1st.', created_at: iso(48) },
    { id: 'en-3002', course_id: 'c-1', user_id: 'demo-learner-2', name: 'Rekha Nair', phone: '+91 97411 45678', email: 'rekha@example.com', mode: 'Offline', message: '', status: 'new', notes: '', created_at: iso(20) },
    { id: 'en-3003', course_id: 'c-19', user_id: 'demo-learner-3', name: 'Sana Khan', phone: '+91 96860 11223', email: 'sana@example.com', mode: 'Online', message: 'Is there a Kannada batch?', status: 'contacted', notes: '', created_at: iso(70) },
  ],
  applications: () => [
    { id: 'ap-4001', type: 'professional', user_id: null, name: 'Divya Gowda', phone: '+91 97400 55667', email: 'divya@example.com', city: 'Mysuru', skill: 'Bridal mehandi', experience_years: 4, message: 'Completed Mehandi Master Class in 2025.', status: 'new', created_at: iso(12) },
    { id: 'ap-4002', type: 'faculty', user_id: null, name: 'Sunita Patil', phone: '+91 96320 77889', email: 'sunita@example.com', city: 'Hubballi', skill: 'Tailoring', experience_years: 18, message: 'Boutique owner, can teach pattern drafting.', status: 'reviewing', created_at: iso(70) },
  ],
  newsletter_subscribers: () => [{ email: 'news@example.com', name: null, created_at: iso(100) }],
  contact_messages: () => [
    { id: 'cm-1', name: 'Harish B.', phone: '+91 98450 99887', email: 'harish@example.com', topic: 'Franchise / partnership', message: 'Interested in a franchise in Davanagere.', status: 'new', created_at: iso(9) },
  ],
  site_content: () => [],
  media: () => [],
  course_lessons: () => [
    { id: 'ls-1', course_id: 'c-13', title: 'Welcome & kit walkthrough', kind: 'video', content: 'What you need for the first week.', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration_mins: 12, sort: 0, free_preview: true, created_at: iso(500) },
    { id: 'ls-2', course_id: 'c-13', title: 'Nail prep and shaping', kind: 'video', content: '', video_url: null, duration_mins: 35, sort: 1, free_preview: false, created_at: iso(500) },
    { id: 'ls-3', course_id: 'c-13', title: 'Hygiene checklist (PDF)', kind: 'download', content: 'Print and keep at your station.', video_url: null, duration_mins: 5, sort: 2, free_preview: false, created_at: iso(500) },
  ],
  course_reviews: () => [
    { id: 'rv-1', course_id: 'c-13', user_id: null, name: 'Anjali R.', rating: 5, comment: 'Practical from day one. Got my first client in week six.', approved: true, created_at: iso(300) },
    { id: 'rv-2', course_id: 'c-13', user_id: null, name: 'Meghana', rating: 4, comment: 'Loved the chrome module. Wish the batch was longer.', approved: false, created_at: iso(10) },
  ],
  certificates: () => [
    { id: 'ce-1', code: 'SD7K2Q9XLM', user_id: 'demo-learner', student_name: 'Priya Sharma', course_id: 'c-18', issued_on: '2026-08-30', created_at: iso(24 * 30) },
  ],
  quizzes: () => [
    { id: 'qz-1', course_id: 'c-13', title: 'Nail prep basics', description: 'Five quick questions on prep and hygiene.', pass_percent: 60, time_limit_mins: 10, published: true, created_at: iso(400),
      questions: [
        { question: 'What should you do first before applying gel polish?', options: ['Apply top coat', 'Prep and dehydrate the nail plate', 'Cure under the lamp'], correct: 2 },
        { question: 'How should metal tools be cleaned between clients?', options: ['Wipe with a tissue', 'Wash and sterilise', 'Rinse with water'], correct: 2 },
        { question: 'Which technique creates a mirror-like finish?', options: ['Chrome powder', 'Ombré sponge', 'Stamping'], correct: 1 },
      ] },
  ],
  assignments: () => [
    { id: 'as-1', course_id: 'c-13', title: 'Chrome set practice', instructions: 'Complete a full chrome set on a practice hand. Upload 3 photos (front, side, close-up) to Google Drive and paste the link.', due_date: new Date(now() + 7 * 86400_000).toISOString().slice(0, 10), max_marks: 100, published: true, created_at: iso(300) },
  ],
  submissions: () => [],
  live_classes: () => [
    { id: 'lc-1', course_id: 'c-13', faculty_id: 'f-kavya', title: 'Live demo: chrome & cat-eye', description: 'Bring your practice hand and chrome powder.', starts_at: inDays(2, 18), duration_mins: 60, platform: 'Google Meet', meeting_url: 'https://meet.google.com/abc-defg-hij', recording_url: null, status: 'scheduled', created_at: iso(50) },
    { id: 'lc-2', course_id: 'c-1', faculty_id: 'f-lakshmi', title: 'Blouse pattern drafting Q&A', description: '', starts_at: inDays(5, 11), duration_mins: 90, platform: 'Zoom', meeting_url: 'https://zoom.us/j/1234567890', recording_url: null, status: 'scheduled', created_at: iso(40) },
  ],
  organisations: () => [
    { id: 'or-1', name: 'Mysuru Skill Centre', type: 'franchise', contact_person: 'Ravi K.', email: 'mysuru@example.com', phone: '+91 98450 44444', city: 'Mysuru', address: 'Saraswathipuram', students: 140, status: 'active', notes: '', created_at: iso(24 * 50) },
    { id: 'or-2', name: 'Govt. First Grade College, Hubballi', type: 'college', contact_person: 'Dr. Patil', email: null, phone: '+91 98450 55555', city: 'Hubballi', address: '', students: 60, status: 'pending', notes: 'Wants a 30-day tailoring batch for final-year students.', created_at: iso(24 * 5) },
  ],
  staff: () => [
    { id: 'st-1', user_id: 'demo-admin', name: 'Syllabdosth Admin', email: 'admin@syllabdosth.com', phone: null, designation: 'Owner', department: 'Management', permissions: ['all'], status: 'active', created_at: iso(24 * 60) },
    { id: 'st-2', user_id: null, name: 'Chandana', email: 'marketing@syllabdosth.com', phone: null, designation: 'Marketing Executive', department: 'Marketing', permissions: ['marketing', 'blog', 'cms'], status: 'active', created_at: iso(24 * 20) },
  ],
  notifications: () => [
    { id: 'nt-1', title: 'Welcome to Syllabdosth', body: 'Your dashboard now shows live classes, quizzes and certificates for your enrolled courses.', audience: 'all', user_id: null, link: '/dashboard', send_email: false, sent_count: 0, created_at: iso(24) },
  ],
  support_tickets: () => [
    { id: 'tk-1', user_id: 'demo-learner', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98450 12345', subject: 'Certificate name spelling', category: 'Certificates', priority: 'normal', status: 'open',
      messages: [{ from: 'user', name: 'Priya Sharma', text: 'My name is spelt "Priya Sharmaa" on the certificate. Can you fix it?', at: iso(6) }], created_at: iso(6), updated_at: iso(6) },
  ],
  faqs: () => demo.faqs.map((f, i) => ({ id: `faq-${i + 1}`, question: f.q, answer: f.a, category: 'General', sort: i, published: true, created_at: iso(500) })),
  testimonials: () => [
    { id: 't-anjali', name: 'Anjali R.', role: 'Nail Art graduate · Mysuru', quote: 'I finished the course in six weeks and had my first paid client the same month. The pricing module alone paid for the fee.', photo_url: 'https://images.unsplash.com/photo-1759840278361-f1adc75529a1?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', rating: 5, sort: 0, published: true, created_at: iso(500) },
    { id: 't-fathima', name: 'Fathima S.', role: 'Bridal Mehandi graduate · Bengaluru', quote: 'The certificate gave customers confidence. I now take 8–10 bridal bookings every wedding season through Syllabdosth.', photo_url: 'https://images.unsplash.com/photo-1552113125-81af17f36b57?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', rating: 5, sort: 1, published: true, created_at: iso(500) },
    { id: 't-kavya', name: 'Kavya P.', role: 'Saree Draping graduate · Hubballi', quote: 'Classes were practical from day one. I learned 12 styles and now drape for events every weekend.', photo_url: 'https://images.unsplash.com/photo-1463335361701-e90f4c5045d0?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', rating: 5, sort: 2, published: true, created_at: iso(500) },
  ],
  offers: () => [
    { id: 'of-1', title: 'Festive offer', code: 'FESTIVE10', description: 'Mention this code when our team calls.', discount_text: '10% off all Master courses', course_id: null, valid_until: new Date(now() + 30 * 86400_000).toISOString().slice(0, 10), active: true, created_at: iso(48) },
  ],
  email_templates: () => [
    { key: 'enrollment_received', name: 'Course enquiry received (to learner)', subject: 'We got your enquiry for {{course}}', body: 'Hi {{name}},\n\nThanks for your interest in {{course}}. Our team will call you on {{phone}} within one working day to confirm your batch.\n\n— Team Syllabdosth', enabled: true },
    { key: 'admin_new_enquiry', name: 'New enquiry (to admin)', subject: 'New {{type}}: {{name}}', body: 'A new {{type}} was submitted on the website.\n\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nDetails: {{details}}\n\nOpen the admin panel to follow up.', enabled: true },
    { key: 'application_received', name: 'Application received (to applicant)', subject: 'Your {{type}} application', body: 'Hi {{name}},\n\nThanks for applying to join Syllabdosth as {{type}}. We review every application and reply within 3 working days.\n\n— Team Syllabdosth', enabled: true },
    { key: 'group_enquiry_received', name: 'Group enquiry received (to customer)', subject: 'Your group booking enquiry', body: 'Hi {{name}},\n\nThanks for your group enquiry for {{people}} people on {{date}}. We will call you to plan the artists.\n\n— Team Syllabdosth', enabled: true },
    { key: 'notification', name: 'Notification email', subject: '{{title}}', body: '{{body}}\n\n{{link}}', enabled: true },
    { key: 'ticket_reply', name: 'Support ticket reply (to user)', subject: 'Re: {{subject}}', body: 'Hi {{name}},\n\n{{reply}}\n\nYou can reply from your dashboard → Support.\n\n— Team Syllabdosth', enabled: true },
  ],
  sms_templates: () => [
    { key: 'enrollment_received', name: 'Course enquiry received', body: 'Hi {{name}}, thanks for your enquiry for {{course}}. Syllabdosth will call you within 1 working day.', dlt_template_id: null, enabled: true },
    { key: 'booking_confirmed', name: 'Booking confirmed', body: 'Hi {{name}}, your booking for {{service}} on {{date}} is confirmed. - Syllabdosth', dlt_template_id: null, enabled: true },
    { key: 'live_class_reminder', name: 'Live class reminder', body: 'Reminder: {{title}} starts at {{time}}. Join: {{link}} - Syllabdosth', dlt_template_id: null, enabled: true },
  ],
  activity_log: () => [],
};

const g = globalThis as unknown as { __sdTables?: Record<string, Row[]> };

/** Mutable in-memory table (demo mode only). */
export function table<T = Row>(name: string): T[] {
  if (!g.__sdTables) g.__sdTables = {};
  if (!g.__sdTables[name]) {
    const seed = seeds[name];
    if (!seed) throw new Error(`Unknown demo table ${name}`);
    g.__sdTables[name] = seed();
  }
  return g.__sdTables[name] as T[];
}

export const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
