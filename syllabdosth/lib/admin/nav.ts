/** Admin sidebar, in the same order as the old panel (payment menus left out for now). */
export type NavItem = { label: string; href?: string; icon: string; children?: { label: string; href: string }[]; badge?: string };

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'Enrollments', href: '/admin/enrollments', icon: 'enroll', badge: 'enrollments' },
  { label: 'Course', icon: 'course', children: [
    { label: 'All Courses', href: '/admin/courses' },
    { label: 'Add New Course', href: '/admin/courses/new' },
    { label: 'Categories', href: '/admin/categories' },
    { label: 'Lessons', href: '/admin/lessons' },
    { label: 'Reviews', href: '/admin/reviews' },
    { label: 'Certificates', href: '/admin/certificates' },
  ] },
  { label: 'Manage Students', href: '/admin/students', icon: 'students' },
  { label: 'Quiz & Assignment', href: '/admin/quizzes', icon: 'quiz', badge: 'submissions' },
  { label: 'Manage Instructors', icon: 'instructor', children: [
    { label: 'All Instructors', href: '/admin/instructors' },
    { label: 'Add Instructor', href: '/admin/instructors/new' },
    { label: 'Applications', href: '/admin/applications' },
  ] },
  { label: 'Manage Organisation', href: '/admin/organisations', icon: 'organisation' },
  { label: 'Live Classes', href: '/admin/live-classes', icon: 'live' },
  { label: 'Staff', icon: 'staff', children: [
    { label: 'All Staff', href: '/admin/staff' },
    { label: 'Add Staff', href: '/admin/staff/new' },
  ] },
  { label: 'Media Library', href: '/admin/media', icon: 'media' },
  { label: 'AI Assistant', href: '/admin/ai', icon: 'ai' },
  { label: 'Blog', icon: 'blog', children: [
    { label: 'All Posts', href: '/admin/blog' },
    { label: 'Add New Post', href: '/admin/blog/new' },
  ] },
  { label: 'Services & Bookings', icon: 'services', badge: 'bookings', children: [
    { label: 'Bookings', href: '/admin/bookings' },
    { label: 'Group Enquiries', href: '/admin/group-enquiries' },
    { label: 'Services', href: '/admin/services' },
    { label: 'Professionals', href: '/admin/professionals' },
  ] },
  { label: 'Notification', icon: 'notification', children: [
    { label: 'Send Notification', href: '/admin/notifications/new' },
    { label: 'All Notifications', href: '/admin/notifications' },
  ] },
  { label: 'Support', icon: 'support', badge: 'tickets', children: [
    { label: 'Tickets', href: '/admin/tickets' },
    { label: 'Contact Messages', href: '/admin/messages' },
    { label: 'FAQs', href: '/admin/faqs' },
  ] },
  { label: 'Marketing', icon: 'marketing', children: [
    { label: 'Offers & Coupons', href: '/admin/offers' },
    { label: 'Testimonials', href: '/admin/testimonials' },
    { label: 'Newsletter Subscribers', href: '/admin/subscribers' },
    { label: 'Announcement Bar', href: '/admin/settings/announcement' },
  ] },
  { label: 'Reports', icon: 'reports', children: [
    { label: 'Enrolment Report', href: '/admin/reports/enrolments' },
    { label: 'Booking Report', href: '/admin/reports/bookings' },
    { label: 'Course Report', href: '/admin/reports/courses' },
    { label: 'Student Report', href: '/admin/reports/students' },
  ] },
  { label: 'CMS', icon: 'cms', children: [
    { label: 'All Pages', href: '/admin/cms' },
    { label: 'Home Page', href: '/admin/cms/home' },
    { label: 'About Page', href: '/admin/cms/about' },
    { label: 'Contact Page', href: '/admin/cms/contact' },
    { label: 'Courses, Services & Blog', href: '/admin/cms/listings' },
    { label: 'Footer', href: '/admin/cms/footer' },
    { label: 'Terms & Privacy', href: '/admin/cms/terms' },
  ] },
  { label: 'Website Settings', icon: 'website', children: [
    { label: 'General', href: '/admin/settings/general' },
    { label: 'Logo & Branding', href: '/admin/settings/branding' },
    { label: 'SEO', href: '/admin/settings/seo' },
    { label: 'Maintenance Mode', href: '/admin/settings/maintenance' },
  ] },
  { label: 'Email Settings', icon: 'email', children: [
    { label: 'SMTP Settings', href: '/admin/settings/email' },
    { label: 'Email Templates', href: '/admin/email-templates' },
  ] },
  { label: 'SMS & OTP', icon: 'sms', children: [
    { label: 'SMS Settings', href: '/admin/settings/sms' },
    { label: 'SMS Templates', href: '/admin/sms-templates' },
    { label: 'Login Methods', href: '/admin/login-methods' },
  ] },
  { label: 'System Settings', icon: 'system', children: [
    { label: 'Users & Roles', href: '/admin/users' },
    { label: 'Activity Log', href: '/admin/activity' },
    { label: 'System Info', href: '/admin/utility#system' },
  ] },
  { label: 'Addon', href: '/admin/settings/addons', icon: 'addon' },
  { label: 'Utility', icon: 'utility', children: [
    { label: 'Export Data', href: '/admin/utility#export' },
    { label: 'Clear Cache', href: '/admin/utility#cache' },
    { label: 'Backup', href: '/admin/utility#backup' },
  ] },
];

/** "Add new" menu in the top bar. */
export const QUICK_ADD = [
  { label: 'Course', href: '/admin/courses/new' },
  { label: 'Lesson', href: '/admin/lessons/new' },
  { label: 'Live class', href: '/admin/live-classes/new' },
  { label: 'Quiz', href: '/admin/quizzes/new' },
  { label: 'Blog post', href: '/admin/blog/new' },
  { label: 'Instructor', href: '/admin/instructors/new' },
  { label: 'Notification', href: '/admin/notifications/new' },
  { label: 'Offer', href: '/admin/offers/new' },
  { label: 'Upload media', href: '/admin/media' },
];
