export type Role = 'learner' | 'professional' | 'faculty' | 'franchise' | 'admin';

export type Category = {
  slug: string;
  name: string;
  image_url?: string | null;
  description?: string;
  /** CSS gradient used for course image placeholders until real photos are uploaded */
  tone: string;
};

export type Module = { title: string; days: number };

export type Course = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  level: 'Basic' | 'Foundation' | 'Certification' | 'Master' | 'Advanced' | 'Pro Master';
  duration_days: number;
  price: number;
  mode: 'Online' | 'Offline' | 'Online & offline';
  language: string;
  rating: number;
  ratings_count: number;
  students: number;
  summary: string;
  description: string;
  outcomes: string[];
  modules: Module[];
  faculty_id: string | null;
  featured: boolean;
  image_url?: string | null;
  published?: boolean;
};

export type Service = {
  id: string;
  slug: string;
  title: string;
  category: string;
  initials: string;
  summary: string;
  description: string;
  price_from: number;
  duration: string;
  image_url?: string | null;
};

export type Professional = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  title: string;
  city: string;
  rating: number;
  bookings_count: number;
  service_ids: string[];
  bio: string;
  verified: boolean;
  user_id?: string | null;
  photo_url?: string | null;
};

export type Faculty = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  years: number;
  students: number;
  bio: string;
  user_id?: string | null;
  photo_url?: string | null;
};

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export type Booking = {
  id: string;
  service_id: string;
  professional_id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  location: string;
  requirements: string;
  status: BookingStatus;
  price_from: number;
  created_at: string;
};

export type EnquiryStatus = 'new' | 'contacted' | 'converted' | 'closed';

export type GroupEnquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  people: number;
  preferred_date: string;
  event_type: string;
  location: string;
  requirements: string;
  status: EnquiryStatus;
  created_at: string;
};

export type EnrollmentEnquiry = {
  id: string;
  course_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  mode: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
};

export type ApplicationType = 'faculty' | 'professional';
export type ApplicationStatus = 'new' | 'reviewing' | 'approved' | 'rejected';

export type Application = {
  id: string;
  type: ApplicationType;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  city: string;
  skill: string;
  experience_years: number;
  message: string;
  status: ApplicationStatus;
  created_at: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  read_mins: number;
  published_at: string;
  intro: string;
  sections: { heading: string; text: string }[];
  quote?: string | null;
  image_url?: string | null;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status?: 'active' | 'blocked';
  city?: string | null;
  created_at?: string;
};

export type Faq = { q: string; a: string };

/* ------------------------------ Admin panel / LMS ------------------------------ */
export type Lesson = { id: string; course_id: string; title: string; kind: 'video' | 'reading' | 'live' | 'download'; content: string; video_url: string | null; duration_mins: number; sort: number; free_preview: boolean };
export type Review = { id: string; course_id: string; user_id: string | null; name: string; rating: number; comment: string; approved: boolean; created_at: string };
export type Certificate = { id: string; code: string; user_id: string | null; student_name: string; course_id: string; issued_on: string };
export type QuizQuestion = { question: string; options: string[]; correct: number };
export type Quiz = { id: string; course_id: string; title: string; description: string; pass_percent: number; time_limit_mins: number; questions: QuizQuestion[]; published: boolean };
export type Assignment = { id: string; course_id: string; title: string; instructions: string; due_date: string | null; max_marks: number; published: boolean };
export type Submission = { id: string; kind: 'quiz' | 'assignment'; quiz_id: string | null; assignment_id: string | null; course_id: string | null; user_id: string | null; student_name: string; answer: string; answers: number[]; score: number | null; max_score: number | null; status: 'submitted' | 'graded' | 'returned'; feedback: string; created_at: string };
export type LiveClass = { id: string; course_id: string | null; faculty_id: string | null; title: string; description: string; starts_at: string; duration_mins: number; platform: string; meeting_url: string | null; recording_url: string | null; status: 'scheduled' | 'live' | 'completed' | 'cancelled' };
export type AppNotification = { id: string; title: string; body: string; audience: 'all' | 'learner' | 'professional' | 'faculty' | 'user'; user_id: string | null; link: string | null; created_at: string };
export type TicketMessage = { from: 'user' | 'admin'; name: string; text: string; at: string };
export type Ticket = { id: string; user_id: string | null; name: string; email: string | null; phone: string | null; subject: string; category: string; priority: 'low' | 'normal' | 'high' | 'urgent'; status: 'open' | 'in_progress' | 'resolved' | 'closed'; messages: TicketMessage[]; created_at: string; updated_at: string };
export type FaqRow = { id: string; question: string; answer: string; category: string; sort: number; published: boolean };
export type Testimonial = { id: string; name: string; role: string; quote: string; photo_url: string | null; rating: number; sort: number; published: boolean };
export type Offer = { id: string; title: string; code: string | null; description: string; discount_text: string; course_id: string | null; valid_until: string | null; active: boolean };
export type MediaItem = { id: string; name: string; url: string; path: string | null; mime: string; size_bytes: number; alt: string; folder: string; created_at: string };
