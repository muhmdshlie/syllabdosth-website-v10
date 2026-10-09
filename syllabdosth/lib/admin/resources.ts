/**
 * Every table the admin panel manages. One entry = a list page, an add form and an edit form
 * (app/(admin)/admin/[resource]). Add a column to the database, add a field here, done.
 */
import type { Field, Option, Resource } from './types';

const o = (...vals: string[]): Option[] => vals.map((v) => ({ value: v, label: v }));
const ol = (pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

export const LEVELS = o('Basic', 'Foundation', 'Certification', 'Master', 'Advanced', 'Pro Master');
export const MODES = o('Online', 'Offline', 'Online & offline');
export const ENQUIRY_STATUS = ol([['new', 'New'], ['contacted', 'Contacted'], ['converted', 'Enrolled / converted'], ['closed', 'Closed']]);
export const BOOKING_STATUS = ol([['pending', 'Pending'], ['confirmed', 'Confirmed'], ['declined', 'Declined'], ['cancelled', 'Cancelled'], ['completed', 'Completed']]);
export const APPLICATION_STATUS = ol([['new', 'New'], ['reviewing', 'Reviewing'], ['approved', 'Approved'], ['rejected', 'Rejected']]);
export const ROLES = ol([['learner', 'Learner / student'], ['professional', 'Professional'], ['faculty', 'Faculty / instructor'], ['franchise', 'Franchise'], ['admin', 'Admin']]);
export const USER_STATUS = ol([['active', 'Active'], ['blocked', 'Blocked']]);
export const PERMISSIONS = ol([
  ['all', 'Everything'], ['courses', 'Courses & lessons'], ['students', 'Students & enrolments'], ['instructors', 'Instructors'],
  ['bookings', 'Services & bookings'], ['blog', 'Blog'], ['cms', 'CMS & website'], ['marketing', 'Marketing'], ['support', 'Support'], ['reports', 'Reports'],
]);

const published: Field = { name: 'published', label: 'Published (visible on the website)', type: 'bool', default: true };
const createdCol = { name: 'created_at', label: 'Added', kind: 'date' as const };

const R: Resource[] = [
  /* ------------------------------------------------------------------ courses */
  {
    key: 'courses', table: 'courses', pk: 'id', label: 'Courses', singular: 'course', titleField: 'title', viewPath: '/courses/{slug}',
    search: ['title', 'summary'],
    filters: [{ name: 'category_slug', label: 'Category', to: 'categories' }, { name: 'published', label: 'Status', options: ol([['true', 'Published'], ['false', 'Draft']]) }],
    columns: [{ name: 'image_url', label: '', kind: 'image' }, { name: 'title', label: 'Course', kind: 'strong' }, { name: 'category_slug', label: 'Category', kind: 'relation', to: 'categories' }, { name: 'price', label: 'Fee', kind: 'money' }, { name: 'students', label: 'Students', kind: 'count' }, { name: 'featured', label: 'Featured', kind: 'bool' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'title', label: 'Course title', type: 'text', required: true, full: true, placeholder: 'e.g. Bridal Mehandi Master Class (45 Days)' },
      { name: 'slug', label: 'Web address', type: 'slug', from: 'title', help: 'Leave blank to create it from the title. Appears as /courses/<this>.' },
      { name: 'category_slug', label: 'Category', type: 'relation', to: 'categories', required: true },
      { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, default: 'Certification' },
      { name: 'mode', label: 'Mode', type: 'select', options: MODES, required: true, default: 'Online & offline' },
      { name: 'duration_days', label: 'Duration (days)', type: 'number', int: true, min: 1, required: true, default: 30 },
      { name: 'price', label: 'Fee (₹)', type: 'number', int: true, min: 0, required: true, default: 0 },
      { name: 'language', label: 'Teaching language(s)', type: 'text', required: true, default: 'English, Hindi, Kannada' },
      { name: 'faculty_id', label: 'Instructor', type: 'relation', to: 'instructors' },
      { name: 'image_url', label: 'Cover image', type: 'image', full: true, help: 'Shown on course cards and the course page. Leave empty to use the category photo.' },
      { name: 'summary', label: 'One-line summary', type: 'textarea', rows: 2, required: true, full: true, max: 220 },
      { name: 'description', label: 'About this course', type: 'textarea', rows: 6, full: true },
      { name: 'outcomes', label: 'What you will learn', type: 'lines', full: true, help: 'One point per line.' },
      { name: 'modules', label: 'Curriculum modules', type: 'list', itemLabel: 'module', titleKey: 'title', full: true, fields: [
        { name: 'title', label: 'Module title', type: 'text', required: true }, { name: 'days', label: 'Days', type: 'number', int: true, min: 1, default: 1 },
      ] },
      { name: 'rating', label: 'Rating shown (0–5)', type: 'number', min: 0, max: 5, default: 4.8 },
      { name: 'ratings_count', label: 'Number of ratings', type: 'number', int: true, min: 0, default: 0 },
      { name: 'students', label: 'Students enrolled (shown)', type: 'number', int: true, min: 0, default: 0 },
      { name: 'featured', label: 'Featured on the home page', type: 'bool' },
      published,
    ],
  },
  {
    key: 'categories', table: 'categories', pk: 'slug', label: 'Course categories', singular: 'category', titleField: 'name', defaultSort: { col: 'sort', asc: true },
    columns: [{ name: 'image_url', label: '', kind: 'image' }, { name: 'name', label: 'Category', kind: 'strong' }, { name: 'slug', label: 'Web address' }, { name: 'sort', label: 'Order' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', from: 'name', createOnly: true, help: 'Used in /courses?category=<this>. Cannot be changed later.' },
      { name: 'image_url', label: 'Category photo', type: 'image', full: true, help: 'Default photo for every course in this category that has no cover of its own.' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true },
      { name: 'sort', label: 'Display order', type: 'number', int: true, default: 0 },
      { name: 'tone', label: 'Placeholder colour (CSS)', type: 'text', default: 'linear-gradient(135deg,#E4E6E0,#C9D8BE)' },
    ],
  },
  {
    key: 'lessons', table: 'course_lessons', pk: 'id', label: 'Lessons', singular: 'lesson', titleField: 'title', defaultSort: { col: 'sort', asc: true },
    search: ['title'], filters: [{ name: 'course_id', label: 'Course', to: 'courses' }, { name: 'kind', label: 'Type', options: ol([['video', 'Video'], ['reading', 'Reading'], ['live', 'Live'], ['download', 'Download']]) }],
    description: 'Lessons appear in the course curriculum and in enrolled learners’ dashboards.',
    columns: [{ name: 'title', label: 'Lesson', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'kind', label: 'Type', kind: 'status' }, { name: 'duration_mins', label: 'Minutes' }, { name: 'free_preview', label: 'Free preview', kind: 'bool' }, { name: 'sort', label: 'Order' }],
    fields: [
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'title', label: 'Lesson title', type: 'text', required: true },
      { name: 'kind', label: 'Type', type: 'select', options: ol([['video', 'Video'], ['reading', 'Reading'], ['live', 'Live session'], ['download', 'Download / PDF']]), default: 'video' },
      { name: 'video_url', label: 'Video / file link', type: 'url', placeholder: 'https://youtube.com/…' },
      { name: 'duration_mins', label: 'Duration (minutes)', type: 'number', int: true, min: 0, default: 10 },
      { name: 'sort', label: 'Order', type: 'number', int: true, default: 0 },
      { name: 'content', label: 'Notes / lesson text', type: 'textarea', rows: 6, full: true },
      { name: 'free_preview', label: 'Free preview (visible before enrolling)', type: 'bool' },
    ],
  },
  {
    key: 'reviews', table: 'course_reviews', pk: 'id', label: 'Course reviews', singular: 'review', titleField: 'name',
    search: ['name', 'comment'], filters: [{ name: 'approved', label: 'Status', options: ol([['false', 'Waiting for approval'], ['true', 'Approved']]) }, { name: 'course_id', label: 'Course', to: 'courses' }],
    description: 'Learners write reviews from their dashboard. Only approved reviews show on course pages.',
    columns: [{ name: 'name', label: 'Learner', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'rating', label: 'Rating', kind: 'stars' }, { name: 'comment', label: 'Review' }, { name: 'approved', label: 'Approved', kind: 'bool' }, createdCol],
    fields: [
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'name', label: 'Learner name', type: 'text', required: true },
      { name: 'rating', label: 'Rating (1–5)', type: 'number', int: true, min: 1, max: 5, default: 5 },
      { name: 'comment', label: 'Review', type: 'textarea', rows: 4, full: true },
      { name: 'approved', label: 'Approved (show on the course page)', type: 'bool' },
    ],
  },
  {
    key: 'certificates', table: 'certificates', pk: 'id', label: 'Certificates', singular: 'certificate', titleField: 'student_name',
    search: ['student_name', 'code'], filters: [{ name: 'course_id', label: 'Course', to: 'courses' }],
    description: 'Each certificate gets a public verification page at /certificates/<code>.',
    viewPath: '/certificates/{code}',
    columns: [{ name: 'student_name', label: 'Student', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'code', label: 'Certificate no.' }, { name: 'issued_on', label: 'Issued', kind: 'date' }],
    fields: [
      { name: 'user_id', label: 'Student account', type: 'relation', to: 'students', help: 'Link it so the certificate appears in their dashboard.' },
      { name: 'student_name', label: 'Name on certificate', type: 'text', required: true },
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'issued_on', label: 'Issue date', type: 'date', required: true },
      { name: 'code', label: 'Certificate number', type: 'text', createOnly: true, help: 'Leave blank to generate one.' },
    ],
  },

  /* ------------------------------------------------------------------ learners */
  {
    key: 'enrollments', table: 'enrollments', pk: 'id', label: 'Enrollments', singular: 'enrollment', titleField: 'name',
    search: ['name', 'email', 'phone'],
    filters: [{ name: 'status', label: 'Status', options: ENQUIRY_STATUS }, { name: 'course_id', label: 'Course', to: 'courses' }],
    description: 'Course enquiries from the website. Mark a learner “Enrolled” to unlock live classes, quizzes and assignments in their dashboard.',
    columns: [{ name: 'name', label: 'Learner', kind: 'strong' }, { name: 'phone', label: 'Phone' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'mode', label: 'Mode' }, { name: 'status', label: 'Status', kind: 'status' }, createdCol],
    fields: [
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'user_id', label: 'Student account', type: 'relation', to: 'students', help: 'Link to a student account so the course shows in their dashboard.' },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'mode', label: 'Mode', type: 'select', options: o('Online', 'Offline', 'Either'), default: 'Online' },
      { name: 'status', label: 'Status', type: 'select', options: ENQUIRY_STATUS, default: 'new' },
      { name: 'message', label: 'Learner’s message', type: 'textarea', rows: 3, full: true },
      { name: 'notes', label: 'Internal notes', type: 'textarea', rows: 3, full: true },
    ],
  },
  {
    key: 'students', table: 'profiles', pk: 'id', label: 'Students', singular: 'student', titleField: 'full_name', baseFilter: { role: 'learner' },
    search: ['full_name', 'email', 'phone'], filters: [{ name: 'status', label: 'Status', options: USER_STATUS }],
    noCreate: true, noDelete: true, createHint: 'Students join by signing up on the website (email, Google or phone).',
    columns: [{ name: 'full_name', label: 'Name', kind: 'strong' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Phone' }, { name: 'city', label: 'City' }, { name: 'status', label: 'Status', kind: 'status' }, { name: 'created_at', label: 'Joined', kind: 'date' }],
    fields: [
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', readonly: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'status', label: 'Account status', type: 'select', options: USER_STATUS, help: 'Blocked students can’t log in.' },
      { name: 'role', label: 'Role', type: 'select', options: ROLES, help: 'Change to Faculty / Professional / Admin to move this account.' },
    ],
  },
  {
    key: 'quizzes', table: 'quizzes', pk: 'id', label: 'Quizzes', singular: 'quiz', titleField: 'title', group: 'learning',
    search: ['title'], filters: [{ name: 'course_id', label: 'Course', to: 'courses' }],
    columns: [{ name: 'title', label: 'Quiz', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'questions', label: 'Questions', kind: 'count' }, { name: 'pass_percent', label: 'Pass %' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'title', label: 'Quiz title', type: 'text', required: true },
      { name: 'pass_percent', label: 'Pass mark (%)', type: 'number', int: true, min: 0, max: 100, default: 60 },
      { name: 'time_limit_mins', label: 'Time limit (minutes, 0 = none)', type: 'number', int: true, min: 0, default: 0 },
      { name: 'description', label: 'Instructions', type: 'textarea', rows: 2, full: true },
      { name: 'questions', label: 'Questions', type: 'list', itemLabel: 'question', titleKey: 'question', full: true, fields: [
        { name: 'question', label: 'Question', type: 'text', required: true, full: true },
        { name: 'options', label: 'Answer options (one per line)', type: 'lines', required: true, full: true },
        { name: 'correct', label: 'Correct option number (1 = first line)', type: 'number', int: true, min: 1, default: 1 },
      ] },
      { ...published, label: 'Published (learners can take it)' },
    ],
  },
  {
    key: 'assignments', table: 'assignments', pk: 'id', label: 'Assignments', singular: 'assignment', titleField: 'title', group: 'learning',
    search: ['title'], filters: [{ name: 'course_id', label: 'Course', to: 'courses' }],
    columns: [{ name: 'title', label: 'Assignment', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'due_date', label: 'Due', kind: 'date' }, { name: 'max_marks', label: 'Marks' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'due_date', label: 'Due date', type: 'date' },
      { name: 'max_marks', label: 'Maximum marks', type: 'number', int: true, min: 1, default: 100 },
      { name: 'instructions', label: 'Instructions', type: 'textarea', rows: 6, required: true, full: true },
      { ...published, label: 'Published (learners can submit)' },
    ],
  },
  {
    key: 'submissions', table: 'submissions', pk: 'id', label: 'Submissions', singular: 'submission', titleField: 'student_name', group: 'learning',
    search: ['student_name'], noCreate: true, createHint: 'Learners submit quizzes and assignments from their dashboard.',
    filters: [{ name: 'kind', label: 'Type', options: ol([['quiz', 'Quiz'], ['assignment', 'Assignment']]) }, { name: 'status', label: 'Status', options: ol([['submitted', 'To grade'], ['graded', 'Graded'], ['returned', 'Returned']]) }, { name: 'course_id', label: 'Course', to: 'courses' }],
    columns: [{ name: 'student_name', label: 'Student', kind: 'strong' }, { name: 'kind', label: 'Type', kind: 'status' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'score', label: 'Score' }, { name: 'status', label: 'Status', kind: 'status' }, { name: 'created_at', label: 'Submitted', kind: 'datetime' }],
    fields: [
      { name: 'student_name', label: 'Student', type: 'text', readonly: true },
      { name: 'kind', label: 'Type', type: 'text', readonly: true },
      { name: 'quiz_id', label: 'Quiz', type: 'relation', to: 'quizzes', readonly: true },
      { name: 'assignment_id', label: 'Assignment', type: 'relation', to: 'assignments', readonly: true },
      { name: 'answer', label: 'Answer / link submitted', type: 'textarea', rows: 5, readonly: true, full: true },
      { name: 'score', label: 'Score', type: 'number', int: true, min: 0 },
      { name: 'max_score', label: 'Out of', type: 'number', int: true, min: 1 },
      { name: 'status', label: 'Status', type: 'select', options: ol([['submitted', 'Submitted (to grade)'], ['graded', 'Graded'], ['returned', 'Returned for changes']]) },
      { name: 'feedback', label: 'Feedback to the learner', type: 'textarea', rows: 4, full: true },
    ],
  },

  /* ------------------------------------------------------------------ instructors & partners */
  {
    key: 'instructors', table: 'faculty', pk: 'id', label: 'Instructors', singular: 'instructor', titleField: 'name',
    search: ['name', 'specialty'], defaultSort: { col: 'students' },
    columns: [{ name: 'photo_url', label: '', kind: 'image' }, { name: 'name', label: 'Name', kind: 'strong' }, { name: 'specialty', label: 'Specialty' }, { name: 'years', label: 'Years' }, { name: 'students', label: 'Students', kind: 'count' }, { name: 'user_id', label: 'Login linked', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'initials', label: 'Initials', type: 'text', required: true, max: 3, help: 'Shown when there is no photo.' },
      { name: 'specialty', label: 'Specialty', type: 'text', required: true },
      { name: 'years', label: 'Years of experience', type: 'number', int: true, min: 0, default: 1 },
      { name: 'students', label: 'Students trained (shown)', type: 'number', int: true, min: 0, default: 0 },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'user_id', label: 'Login account', type: 'relation', to: 'users', help: 'Link their account to give them the Faculty dashboard. Their role becomes Faculty.' },
      { name: 'photo_url', label: 'Photo', type: 'image', full: true },
      { name: 'bio', label: 'Bio', type: 'textarea', rows: 4, full: true },
    ],
  },
  {
    key: 'applications', table: 'applications', pk: 'id', label: 'Applications', singular: 'application', titleField: 'name',
    search: ['name', 'email', 'skill'], noCreate: true, createHint: 'People apply from /apply/faculty and /apply/professional.',
    filters: [{ name: 'type', label: 'Type', options: ol([['faculty', 'Faculty'], ['professional', 'Professional']]) }, { name: 'status', label: 'Status', options: APPLICATION_STATUS }],
    description: 'Approving an applicant who has an account upgrades their role automatically.',
    columns: [{ name: 'name', label: 'Applicant', kind: 'strong' }, { name: 'type', label: 'Type', kind: 'status' }, { name: 'skill', label: 'Skill' }, { name: 'city', label: 'City' }, { name: 'status', label: 'Status', kind: 'status' }, createdCol],
    fields: [
      { name: 'type', label: 'Applying as', type: 'select', options: ol([['faculty', 'Faculty'], ['professional', 'Professional']]) },
      { name: 'status', label: 'Status', type: 'select', options: APPLICATION_STATUS },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'skill', label: 'Skill', type: 'text', required: true },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', int: true, min: 0 },
      { name: 'message', label: 'Message', type: 'textarea', rows: 4, full: true },
    ],
  },
  {
    key: 'organisations', table: 'organisations', pk: 'id', label: 'Organisations', singular: 'organisation', titleField: 'name',
    search: ['name', 'city', 'contact_person'],
    filters: [{ name: 'type', label: 'Type', options: ol([['franchise', 'Franchise'], ['training_partner', 'Training partner'], ['corporate', 'Corporate'], ['college', 'College'], ['other', 'Other']]) }, { name: 'status', label: 'Status', options: ol([['active', 'Active'], ['pending', 'Pending'], ['inactive', 'Inactive']]) }],
    description: 'Franchises, training partners, colleges and corporate clients.',
    columns: [{ name: 'name', label: 'Organisation', kind: 'strong' }, { name: 'type', label: 'Type', kind: 'status' }, { name: 'city', label: 'City' }, { name: 'contact_person', label: 'Contact' }, { name: 'students', label: 'Students', kind: 'count' }, { name: 'status', label: 'Status', kind: 'status' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, full: true },
      { name: 'type', label: 'Type', type: 'select', options: ol([['franchise', 'Franchise'], ['training_partner', 'Training partner'], ['corporate', 'Corporate client'], ['college', 'College / school'], ['other', 'Other']]), default: 'training_partner' },
      { name: 'status', label: 'Status', type: 'select', options: ol([['active', 'Active'], ['pending', 'Pending'], ['inactive', 'Inactive']]), default: 'active' },
      { name: 'contact_person', label: 'Contact person', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'students', label: 'Students', type: 'number', int: true, min: 0, default: 0 },
      { name: 'address', label: 'Address', type: 'textarea', rows: 2, full: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, full: true },
    ],
  },
  {
    key: 'live-classes', table: 'live_classes', pk: 'id', label: 'Live classes', singular: 'live class', titleField: 'title', defaultSort: { col: 'starts_at' },
    search: ['title'], filters: [{ name: 'status', label: 'Status', options: ol([['scheduled', 'Scheduled'], ['live', 'Live now'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]) }, { name: 'course_id', label: 'Course', to: 'courses' }],
    description: 'Enrolled learners see these in their dashboard with the join link.',
    columns: [{ name: 'title', label: 'Class', kind: 'strong' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'faculty_id', label: 'Instructor', kind: 'relation', to: 'instructors' }, { name: 'starts_at', label: 'Starts', kind: 'datetime' }, { name: 'platform', label: 'Platform' }, { name: 'status', label: 'Status', kind: 'status' }],
    fields: [
      { name: 'title', label: 'Class title', type: 'text', required: true, full: true },
      { name: 'course_id', label: 'Course', type: 'relation', to: 'courses', help: 'Only learners enrolled in this course see it. Leave empty for everyone.' },
      { name: 'faculty_id', label: 'Instructor', type: 'relation', to: 'instructors' },
      { name: 'starts_at', label: 'Starts at (IST)', type: 'datetime', required: true },
      { name: 'duration_mins', label: 'Duration (minutes)', type: 'number', int: true, min: 5, default: 60 },
      { name: 'platform', label: 'Platform', type: 'select', options: o('Google Meet', 'Zoom', 'YouTube Live', 'Microsoft Teams', 'In person'), default: 'Google Meet' },
      { name: 'status', label: 'Status', type: 'select', options: ol([['scheduled', 'Scheduled'], ['live', 'Live now'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]), default: 'scheduled' },
      { name: 'meeting_url', label: 'Join link', type: 'url', full: true },
      { name: 'recording_url', label: 'Recording link (after class)', type: 'url', full: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true },
    ],
  },
  {
    key: 'staff', table: 'staff', pk: 'id', label: 'Staff', singular: 'staff member', titleField: 'name',
    search: ['name', 'email', 'designation'], filters: [{ name: 'department', label: 'Department', options: o('Management', 'Marketing', 'Academics', 'Operations', 'Support', 'Accounts') }],
    description: 'Your team directory. Linking a staff member’s login account gives them access to this admin panel.',
    columns: [{ name: 'name', label: 'Name', kind: 'strong' }, { name: 'designation', label: 'Designation' }, { name: 'department', label: 'Department' }, { name: 'email', label: 'Email' }, { name: 'user_id', label: 'Admin access', kind: 'bool' }, { name: 'status', label: 'Status', kind: 'status' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'designation', label: 'Designation', type: 'text' },
      { name: 'department', label: 'Department', type: 'select', options: o('Management', 'Marketing', 'Academics', 'Operations', 'Support', 'Accounts'), default: 'Operations' },
      { name: 'status', label: 'Status', type: 'select', options: ol([['active', 'Active'], ['inactive', 'Inactive']]), default: 'active' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'user_id', label: 'Login account (gives admin access)', type: 'relation', to: 'users', full: true, help: 'Their account’s role becomes Admin. Remove the link to take access away.' },
      { name: 'permissions', label: 'Responsibilities', type: 'multiselect', options: PERMISSIONS, full: true, help: 'For your records: every admin can open every page.' },
    ],
  },

  /* ------------------------------------------------------------------ content */
  {
    key: 'blog', table: 'blog_posts', pk: 'slug', label: 'Blog posts', singular: 'post', titleField: 'title', viewPath: '/blog/{slug}', defaultSort: { col: 'published_at' },
    search: ['title', 'excerpt'], filters: [{ name: 'published', label: 'Status', options: ol([['true', 'Published'], ['false', 'Draft']]) }],
    columns: [{ name: 'image_url', label: '', kind: 'image' }, { name: 'title', label: 'Title', kind: 'strong' }, { name: 'category', label: 'Category' }, { name: 'author', label: 'Author' }, { name: 'published_at', label: 'Date', kind: 'date' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, full: true },
      { name: 'slug', label: 'Web address', type: 'slug', from: 'title', createOnly: true, help: 'Appears as /blog/<this>. Cannot be changed later.' },
      { name: 'category', label: 'Category', type: 'text', required: true, default: 'Career' },
      { name: 'author', label: 'Author', type: 'text', required: true },
      { name: 'published_at', label: 'Publish date', type: 'date', required: true },
      { name: 'read_mins', label: 'Reading time (min)', type: 'number', int: true, min: 1, default: 4 },
      { name: 'image_url', label: 'Cover image', type: 'image', full: true },
      { name: 'excerpt', label: 'Short excerpt', type: 'textarea', rows: 2, full: true },
      { name: 'intro', label: 'Introduction', type: 'textarea', rows: 4, full: true },
      { name: 'sections', label: 'Sections', type: 'list', itemLabel: 'section', titleKey: 'heading', full: true, fields: [
        { name: 'heading', label: 'Heading', type: 'text', required: true, full: true }, { name: 'text', label: 'Text', type: 'textarea', rows: 5, full: true },
      ] },
      { name: 'quote', label: 'Pull quote', type: 'textarea', rows: 2, full: true },
      published,
    ],
  },
  {
    key: 'faqs', table: 'faqs', pk: 'id', label: 'FAQs', singular: 'FAQ', titleField: 'question', defaultSort: { col: 'sort', asc: true },
    search: ['question', 'answer'], description: 'Shown on the home page and the Help page.',
    columns: [{ name: 'question', label: 'Question', kind: 'strong' }, { name: 'category', label: 'Category' }, { name: 'sort', label: 'Order' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true, full: true },
      { name: 'answer', label: 'Answer', type: 'textarea', rows: 4, required: true, full: true },
      { name: 'category', label: 'Category', type: 'text', default: 'General' },
      { name: 'sort', label: 'Order', type: 'number', int: true, default: 0 },
      published,
    ],
  },
  {
    key: 'testimonials', table: 'testimonials', pk: 'id', label: 'Testimonials', singular: 'testimonial', titleField: 'name', defaultSort: { col: 'sort', asc: true },
    description: 'Success stories on the home page.',
    columns: [{ name: 'photo_url', label: '', kind: 'image' }, { name: 'name', label: 'Name', kind: 'strong' }, { name: 'role', label: 'Course · city' }, { name: 'rating', label: 'Rating', kind: 'stars' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'role', label: 'Course · city', type: 'text', placeholder: 'Nail Art graduate · Mysuru' },
      { name: 'quote', label: 'Quote', type: 'textarea', rows: 4, required: true, full: true },
      { name: 'photo_url', label: 'Photo', type: 'image', full: true },
      { name: 'rating', label: 'Stars (1–5)', type: 'number', int: true, min: 1, max: 5, default: 5 },
      { name: 'sort', label: 'Order', type: 'number', int: true, default: 0 },
      published,
    ],
  },

  /* ------------------------------------------------------------------ services & bookings */
  {
    key: 'services', table: 'services', pk: 'id', label: 'Services', singular: 'service', titleField: 'title', viewPath: '/services/{slug}', defaultSort: { col: 'sort', asc: true },
    search: ['title', 'summary'],
    columns: [{ name: 'image_url', label: '', kind: 'image' }, { name: 'title', label: 'Service', kind: 'strong' }, { name: 'category', label: 'Category' }, { name: 'price_from', label: 'From', kind: 'money' }, { name: 'published', label: 'Published', kind: 'bool' }],
    fields: [
      { name: 'title', label: 'Service name', type: 'text', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', from: 'title', help: 'Appears as /services/<this>.' },
      { name: 'category', label: 'Category', type: 'text', required: true, placeholder: 'Beauty' },
      { name: 'initials', label: 'Initials', type: 'text', required: true, max: 3 },
      { name: 'price_from', label: 'Starting price (₹)', type: 'number', int: true, min: 0, required: true },
      { name: 'duration', label: 'Duration', type: 'text', placeholder: '1–2 hours' },
      { name: 'image_url', label: 'Photo', type: 'image', full: true },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 2, full: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, full: true },
      { name: 'sort', label: 'Order', type: 'number', int: true, default: 0 },
      published,
    ],
  },
  {
    key: 'professionals', table: 'professionals', pk: 'id', label: 'Professionals', singular: 'professional', titleField: 'name', viewPath: '/pros/{slug}', defaultSort: { col: 'rating' },
    search: ['name', 'title', 'city'], filters: [{ name: 'verified', label: 'Status', options: ol([['true', 'Verified'], ['false', 'Not verified']]) }],
    columns: [{ name: 'photo_url', label: '', kind: 'image' }, { name: 'name', label: 'Name', kind: 'strong' }, { name: 'title', label: 'Title' }, { name: 'city', label: 'City' }, { name: 'rating', label: 'Rating' }, { name: 'verified', label: 'Verified', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'Business / display name', type: 'text', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', from: 'name', help: 'Appears as /pros/<this>.' },
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Bridal makeup artist' },
      { name: 'initials', label: 'Initials', type: 'text', required: true, max: 3 },
      { name: 'city', label: 'City', type: 'text', default: 'Bengaluru' },
      { name: 'rating', label: 'Rating', type: 'number', min: 0, max: 5, default: 5 },
      { name: 'bookings_count', label: 'Bookings (shown)', type: 'number', int: true, min: 0, default: 0 },
      { name: 'service_ids', label: 'Services offered', type: 'multirelation', to: 'services', full: true },
      { name: 'user_id', label: 'Login account', type: 'relation', to: 'users', help: 'Link their account to give them the Professional dashboard.' },
      { name: 'photo_url', label: 'Photo', type: 'image', full: true },
      { name: 'bio', label: 'Bio', type: 'textarea', rows: 3, full: true },
      { name: 'verified', label: 'Verified (listed on the website)', type: 'bool' },
    ],
  },
  {
    key: 'bookings', table: 'bookings', pk: 'id', label: 'Bookings', singular: 'booking', titleField: 'name', noCreate: true, createHint: 'Customers book from a service page.',
    search: ['name', 'phone', 'location'], filters: [{ name: 'status', label: 'Status', options: BOOKING_STATUS }, { name: 'service_id', label: 'Service', to: 'services' }],
    viewPath: '/bookings/{id}',
    columns: [{ name: 'name', label: 'Customer', kind: 'strong' }, { name: 'service_id', label: 'Service', kind: 'relation', to: 'services' }, { name: 'professional_id', label: 'Professional', kind: 'relation', to: 'professionals' }, { name: 'preferred_date', label: 'Date', kind: 'date' }, { name: 'status', label: 'Status', kind: 'status' }],
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: BOOKING_STATUS },
      { name: 'service_id', label: 'Service', type: 'relation', to: 'services', required: true },
      { name: 'professional_id', label: 'Professional', type: 'relation', to: 'professionals', required: true },
      { name: 'name', label: 'Customer name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'preferred_date', label: 'Date', type: 'date', required: true },
      { name: 'preferred_time', label: 'Time (HH:MM)', type: 'text', required: true },
      { name: 'price_from', label: 'Price from (₹)', type: 'number', int: true, min: 0 },
      { name: 'location', label: 'Location', type: 'textarea', rows: 2, full: true, required: true },
      { name: 'requirements', label: 'Requirements', type: 'textarea', rows: 3, full: true },
      { name: 'notes', label: 'Internal notes', type: 'textarea', rows: 3, full: true },
    ],
  },
  {
    key: 'group-enquiries', table: 'group_enquiries', pk: 'id', label: 'Group enquiries', singular: 'group enquiry', titleField: 'name', noCreate: true, createHint: 'Groups enquire from /group-booking.',
    search: ['name', 'email', 'event_type'], filters: [{ name: 'status', label: 'Status', options: ENQUIRY_STATUS }],
    columns: [{ name: 'name', label: 'Contact', kind: 'strong' }, { name: 'event_type', label: 'Event' }, { name: 'people', label: 'People' }, { name: 'preferred_date', label: 'Date', kind: 'date' }, { name: 'status', label: 'Status', kind: 'status' }, createdCol],
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: ENQUIRY_STATUS },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'people', label: 'People', type: 'number', int: true, min: 2 },
      { name: 'preferred_date', label: 'Date', type: 'date', required: true },
      { name: 'event_type', label: 'Event / services', type: 'text', required: true, full: true },
      { name: 'location', label: 'Location', type: 'text', required: true, full: true },
      { name: 'requirements', label: 'Requirements', type: 'textarea', rows: 3, full: true },
      { name: 'notes', label: 'Internal notes', type: 'textarea', rows: 3, full: true },
    ],
  },

  /* ------------------------------------------------------------------ communication */
  {
    key: 'notifications', table: 'notifications', pk: 'id', label: 'Notifications', singular: 'notification', titleField: 'title',
    search: ['title', 'body'], filters: [{ name: 'audience', label: 'Sent to', options: ol([['all', 'Everyone'], ['learner', 'Students'], ['faculty', 'Faculty'], ['professional', 'Professionals'], ['user', 'One person']]) }],
    description: 'Notifications appear in users’ dashboards. Tick “Also email” to send them by email too (needs Email Settings).',
    columns: [{ name: 'title', label: 'Title', kind: 'strong' }, { name: 'audience', label: 'Sent to', kind: 'status' }, { name: 'send_email', label: 'Emailed', kind: 'bool' }, { name: 'sent_count', label: 'Emails sent', kind: 'count' }, { name: 'created_at', label: 'Sent', kind: 'datetime' }],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, full: true },
      { name: 'body', label: 'Message', type: 'textarea', rows: 4, required: true, full: true },
      { name: 'audience', label: 'Send to', type: 'select', options: ol([['all', 'Everyone'], ['learner', 'All students'], ['faculty', 'All faculty'], ['professional', 'All professionals'], ['user', 'One person']]), default: 'all' },
      { name: 'user_id', label: 'Person', type: 'relation', to: 'users', showIf: { field: 'audience', equals: ['user'] } },
      { name: 'link', label: 'Link (optional)', type: 'text', placeholder: '/courses or https://…', full: true },
      { name: 'send_email', label: 'Also email it', type: 'bool', createOnly: true },
    ],
  },
  {
    key: 'tickets', table: 'support_tickets', pk: 'id', label: 'Support tickets', singular: 'ticket', titleField: 'subject', defaultSort: { col: 'updated_at' },
    search: ['subject', 'name', 'email'], filters: [{ name: 'status', label: 'Status', options: ol([['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['closed', 'Closed']]) }, { name: 'priority', label: 'Priority', options: ol([['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']]) }],
    columns: [{ name: 'subject', label: 'Subject', kind: 'strong' }, { name: 'name', label: 'From' }, { name: 'category', label: 'Category' }, { name: 'priority', label: 'Priority', kind: 'status' }, { name: 'status', label: 'Status', kind: 'status' }, { name: 'updated_at', label: 'Updated', kind: 'datetime' }],
    fields: [
      { name: 'subject', label: 'Subject', type: 'text', required: true, full: true },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'user_id', label: 'Account', type: 'relation', to: 'users' },
      { name: 'category', label: 'Category', type: 'select', options: o('General', 'Courses', 'Bookings', 'Certificates', 'Account', 'Technical'), default: 'General' },
      { name: 'priority', label: 'Priority', type: 'select', options: ol([['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']]), default: 'normal' },
      { name: 'status', label: 'Status', type: 'select', options: ol([['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['closed', 'Closed']]), default: 'open' },
    ],
  },
  {
    key: 'messages', table: 'contact_messages', pk: 'id', label: 'Contact messages', singular: 'message', titleField: 'name', noCreate: true, createHint: 'Messages come from the Contact page.',
    search: ['name', 'email', 'message'], filters: [{ name: 'status', label: 'Status', options: ol([['new', 'New'], ['replied', 'Replied'], ['closed', 'Closed']]) }],
    columns: [{ name: 'name', label: 'From', kind: 'strong' }, { name: 'topic', label: 'Topic' }, { name: 'message', label: 'Message' }, { name: 'status', label: 'Status', kind: 'status' }, { name: 'created_at', label: 'Received', kind: 'datetime' }],
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: ol([['new', 'New'], ['replied', 'Replied'], ['closed', 'Closed']]) },
      { name: 'name', label: 'Name', type: 'text', readonly: true },
      { name: 'phone', label: 'Phone', type: 'text', readonly: true },
      { name: 'email', label: 'Email', type: 'email', readonly: true },
      { name: 'topic', label: 'Topic', type: 'text', readonly: true },
      { name: 'message', label: 'Message', type: 'textarea', rows: 6, readonly: true, full: true },
    ],
  },

  /* ------------------------------------------------------------------ marketing */
  {
    key: 'offers', table: 'offers', pk: 'id', label: 'Offers & coupons', singular: 'offer', titleField: 'title',
    search: ['title', 'code'], filters: [{ name: 'active', label: 'Status', options: ol([['true', 'Active'], ['false', 'Inactive']]) }],
    description: 'Active offers show on course pages. Learners mention the code when your team calls (online payment is not switched on yet).',
    columns: [{ name: 'title', label: 'Offer', kind: 'strong' }, { name: 'code', label: 'Code' }, { name: 'discount_text', label: 'Discount' }, { name: 'course_id', label: 'Course', kind: 'relation', to: 'courses' }, { name: 'valid_until', label: 'Valid until', kind: 'date' }, { name: 'active', label: 'Active', kind: 'bool' }],
    fields: [
      { name: 'title', label: 'Offer title', type: 'text', required: true },
      { name: 'code', label: 'Coupon code', type: 'text', placeholder: 'FESTIVE10' },
      { name: 'discount_text', label: 'Discount shown', type: 'text', required: true, placeholder: '10% off all Master courses' },
      { name: 'course_id', label: 'Only for this course', type: 'relation', to: 'courses', help: 'Leave empty to show on every course.' },
      { name: 'valid_until', label: 'Valid until', type: 'date' },
      { name: 'description', label: 'Details', type: 'textarea', rows: 3, full: true },
      { name: 'active', label: 'Active', type: 'bool', default: true },
    ],
  },
  {
    key: 'subscribers', table: 'newsletter_subscribers', pk: 'email', label: 'Newsletter subscribers', singular: 'subscriber', titleField: 'email',
    search: ['email'], noEdit: true,
    columns: [{ name: 'email', label: 'Email', kind: 'strong' }, { name: 'name', label: 'Name' }, { name: 'created_at', label: 'Subscribed', kind: 'datetime' }],
    fields: [{ name: 'email', label: 'Email', type: 'email', required: true, createOnly: true }, { name: 'name', label: 'Name', type: 'text' }],
  },

  /* ------------------------------------------------------------------ settings tables */
  {
    key: 'email-templates', table: 'email_templates', pk: 'key', label: 'Email templates', singular: 'template', titleField: 'name', noCreate: true, noDelete: true, defaultSort: { col: 'key', asc: true },
    description: 'Use {{name}}, {{course}}, {{phone}} … placeholders; they are filled in when the email is sent.',
    columns: [{ name: 'name', label: 'Template', kind: 'strong' }, { name: 'subject', label: 'Subject' }, { name: 'enabled', label: 'On', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, full: true },
      { name: 'subject', label: 'Subject', type: 'text', required: true, full: true },
      { name: 'body', label: 'Message', type: 'textarea', rows: 10, required: true, full: true },
      { name: 'enabled', label: 'Send this email', type: 'bool' },
    ],
  },
  {
    key: 'sms-templates', table: 'sms_templates', pk: 'key', label: 'SMS templates', singular: 'template', titleField: 'name', noCreate: true, noDelete: true, defaultSort: { col: 'key', asc: true },
    description: 'Indian SMS needs each template registered on the DLT portal first; paste its DLT template ID here.',
    columns: [{ name: 'name', label: 'Template', kind: 'strong' }, { name: 'body', label: 'Text' }, { name: 'dlt_template_id', label: 'DLT ID' }, { name: 'enabled', label: 'On', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, full: true },
      { name: 'body', label: 'Text', type: 'textarea', rows: 4, required: true, full: true, max: 320 },
      { name: 'dlt_template_id', label: 'DLT template ID', type: 'text' },
      { name: 'enabled', label: 'On', type: 'bool' },
    ],
  },
  {
    key: 'users', table: 'profiles', pk: 'id', label: 'Users & roles', singular: 'user', titleField: 'full_name',
    search: ['full_name', 'email', 'phone'], filters: [{ name: 'role', label: 'Role', options: ROLES }, { name: 'status', label: 'Status', options: USER_STATUS }],
    noCreate: true, noDelete: true, createHint: 'People create accounts by signing up on the website.',
    columns: [{ name: 'full_name', label: 'Name', kind: 'strong' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Phone' }, { name: 'role', label: 'Role', kind: 'role' }, { name: 'status', label: 'Status', kind: 'status' }, { name: 'created_at', label: 'Joined', kind: 'date' }],
    fields: [
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', readonly: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'role', label: 'Role', type: 'select', options: ROLES },
      { name: 'status', label: 'Status', type: 'select', options: USER_STATUS },
    ],
  },
  {
    key: 'activity', table: 'activity_log', pk: 'id', label: 'Activity log', singular: 'entry', titleField: 'summary', noCreate: true, noEdit: true, noDelete: true,
    search: ['summary', 'actor_name'], filters: [{ name: 'action', label: 'Action', options: ol([['create', 'Added'], ['update', 'Edited'], ['delete', 'Deleted'], ['settings', 'Settings'], ['upload', 'Upload'], ['cache', 'Cache']]) }],
    description: 'Everything changed from the admin panel, newest first.',
    columns: [{ name: 'created_at', label: 'When', kind: 'datetime' }, { name: 'actor_name', label: 'Who', kind: 'strong' }, { name: 'action', label: 'Action', kind: 'status' }, { name: 'entity', label: 'Section' }, { name: 'summary', label: 'What' }],
    fields: [],
    perPage: 50,
  },
];

export const RESOURCES: Record<string, Resource> = Object.fromEntries(R.map((r) => [r.key, r]));
export const resourceList = R;

export function getResource(key: string): Resource | null {
  return RESOURCES[key] ?? null;
}

/** Tabs shown on grouped list pages (e.g. Quizzes | Assignments | Submissions). */
export function groupTabs(group?: string) {
  return group ? R.filter((r) => r.group === group).map((r) => ({ key: r.key, label: r.label })) : [];
}
