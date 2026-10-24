/**
 * Everything editable from Admin → CMS and Admin → Settings.
 * Each entry = one row in the site_content table. `defaults` is the website's original content:
 * the site shows it until an admin saves a change, and "Reset to default" brings it back.
 */
import type { Field, Row } from '../admin/types';
import { stats as defaultStats } from '../demo-data';
import { craftStory, galleryPhotos, heroPhotos, photo } from '../images';

export type ContentDef = {
  key: string;
  title: string;
  kind: 'page' | 'settings';
  description?: string;
  viewPath?: string;
  fields: Field[];
  defaults: Row;
};

const t = (name: string, label: string, extra: Partial<Field> = {}): Field => ({ name, label, type: 'text', ...extra });
const ta = (name: string, label: string, rows = 3, extra: Partial<Field> = {}): Field => ({ name, label, type: 'textarea', rows, full: true, ...extra });
const img = (name: string, label: string, extra: Partial<Field> = {}): Field => ({ name, label, type: 'image', full: true, ...extra });
const group = (name: string, label: string, fields: Field[]): Field => ({ name, label, type: 'group', full: true, fields });
const header = (name: string, label: string, withSub = true): Field => group(name, label, [t('eyebrow', 'Small label above'), t('title', 'Heading', { full: true }), ...(withSub ? [ta('sub', 'Text under the heading', 2)] : [])]);

/* ------------------------------------------------------------------ pages */
const home: ContentDef = {
  key: 'page.home', title: 'Home page', kind: 'page', viewPath: '/',
  description: 'Every section of the home page, top to bottom. Courses, services, faculty, testimonials, FAQs and blog posts come from their own menus.',
  fields: [
    group('hero', 'Hero (first screen)', [
      img('image', 'Main photo', { help: 'Large photo that opens to full screen on scroll. Use a wide photo, at least 1600px.' }),
      t('alt', 'Photo description (for screen readers)', { full: true }),
      img('depth', '3D depth map (optional)', { help: 'Grey-scale map for the 3D effect. It is only used with the original photo; changing the photo turns the effect off.' }),
      ta('topLeft', 'Small text, top left', 2), ta('topRight', 'Small text, top right', 2),
      t('title1', 'Headline, line 1'), t('title2', 'Headline, line 2 (script style)'),
      t('primaryCta', 'Main button'), t('secondaryCta', 'Second button'),
      t('second1', 'Text shown while scrolling, line 1'), t('second2', 'Text shown while scrolling, line 2'),
    ]),
    { name: 'stats', label: 'Numbers (hero and About page)', type: 'list', itemLabel: 'number', titleKey: 'label', full: true, fields: [t('value', 'Number', { required: true, placeholder: '200+' }), t('label', 'Label', { required: true })] },
    group('manifesto', 'Manifesto (big text that lights up)', [ta('text', 'Paragraph', 5), { name: 'footnotes', label: 'Two small notes under it (one per line)', type: 'lines', full: true }]),
    { name: 'story', label: 'Story: Learn → Create → Master → Earn', type: 'list', itemLabel: 'scene', titleKey: 'word', full: true, fields: [
      t('word', 'Big word', { required: true }), t('eyebrow', 'Small label'), ta('line', 'Line of text', 2),
      img('image', 'Centre photo'), t('alt', 'Photo description', { full: true }),
      { name: 'callouts', label: 'Floating cards', type: 'list', itemLabel: 'card', titleKey: 'title', full: true, fields: [img('image', 'Small photo'), t('title', 'Title'), t('text', 'Text')] },
    ] },
    header('courses', 'Courses section'),
    header('services', 'Services section'),
    group('groupBanner', 'Group bookings banner', [t('eyebrow', 'Small label'), t('title', 'Heading', { full: true }), t('cta', 'Button')]),
    group('gallery', 'Gallery', [t('eyebrow', 'Small label'), t('title', 'Heading', { full: true }), ta('sub', 'Text under the heading', 2),
      { name: 'items', label: 'Photos', type: 'list', itemLabel: 'photo', titleKey: 'label', full: true, fields: [t('label', 'Caption', { required: true }), img('image', 'Photo')] },
      t('cardEyebrow', 'Last tile: small label'), t('cardTitle1', 'Last tile: line 1'), t('cardTitle2', 'Last tile: line 2')]),
    header('faculty', 'Faculty section'),
    group('testimonials', 'Success stories section', [t('eyebrow', 'Small label'), t('title', 'Heading', { full: true }), t('note', 'Small note under the cards', { full: true })]),
    header('faq', 'FAQ section'),
    header('blog', 'Blog section', false),
    group('closing', 'Closing banner', [t('eyebrow', 'Small label'), t('title1', 'Heading, line 1'), t('title2', 'Heading, line 2'), ta('text', 'Text', 3), t('primaryCta', 'Main button'), t('secondaryCta', 'Second button')]),
    group('newsletter', 'Newsletter box', [t('title', 'Heading', { full: true }), t('text', 'Text', { full: true })]),
  ],
  defaults: {
    hero: {
      image: heroPhotos.main.src, alt: heroPhotos.main.alt, depth: heroPhotos.main.depth,
      topLeft: 'Certified skill courses\nBengaluru, Karnataka', topRight: 'Tailoring · Nail art · Mehandi\nSaree draping · Embroidery · Beauty',
      title1: 'Learn a craft,', title2: 'Book a master', primaryCta: 'Explore courses', secondaryCta: 'Book a service',
      second1: 'Explore every craft', second2: 'of the Syllabdosth studio',
    },
    stats: defaultStats,
    manifesto: {
      text: 'Syllabdosth is more than a course. It is a craft you can hold in your hands, a certificate that opens doors, and a career you build one client at a time — taught by professionals who still take bookings, practised on real work from the very first day.',
      footnotes: ['200+ certified courses across tailoring, beauty, nail art, mehandi, saree draping and embroidery.', ''],
    },
    story: craftStory.map((s) => ({ word: s.word, eyebrow: s.eyebrow, line: s.line, image: s.center.src, alt: s.center.alt, callouts: s.callouts.map((c) => ({ image: c.img, title: c.title, text: c.text })) })),
    courses: { eyebrow: 'Learn', title: 'Courses worth certifying in', sub: 'Programmes taught by working professionals, with a certificate that gets you listed on Syllabdosth.' },
    services: { eyebrow: 'Book', title: 'Or book a verified professional', sub: 'Every pro here has completed a Syllabdosth certification and taken real bookings before yours.' },
    groupBanner: { eyebrow: 'Groups & corporate', title: 'Workshops for bridal parties, offices and campuses', cta: 'Enquire for a group' },
    gallery: {
      eyebrow: 'Gallery', title: 'A closer look at the craft', sub: 'Work from Syllabdosth-certified professionals.',
      items: galleryPhotos.map((g) => ({ label: g.label, image: g.src })),
      cardEyebrow: 'Book a certified pro', cardTitle1: 'Love the work?', cardTitle2: 'Book the artist',
    },
    faculty: { eyebrow: 'Faculty', title: 'Taught by working professionals', sub: 'Faculty who still take bookings themselves — not full-time trainers reading a syllabus.' },
    testimonials: { eyebrow: 'Success stories', title: 'Learners who now run their own bookings', note: '' },
    faq: { eyebrow: 'FAQ', title: 'Questions, answered', sub: "Can't find your answer? We reply on WhatsApp within the day." },
    blog: { eyebrow: 'Journal', title: 'Career tips and craft know-how' },
    closing: {
      eyebrow: 'Teach · Serve · Partner', title1: 'Teach, serve,', title2: 'or both',
      text: 'Apply as faculty to teach a course, register as a professional to take bookings, or do both under one profile. Franchise and training-partner enquiries welcome.',
      primaryCta: 'Apply as faculty', secondaryCta: 'Register as a pro',
    },
    newsletter: { title: 'Get course drops in your inbox', text: 'New certifications and faculty, roughly twice a month. No spam.' },
  },
};

const about: ContentDef = {
  key: 'page.about', title: 'About page', kind: 'page', viewPath: '/about',
  fields: [
    t('title', 'Heading', { full: true, help: 'Leave as is to use your tagline.' }), ta('sub', 'Introduction', 3),
    img('image', 'Banner photo (optional)'),
    t('whyTitle', 'Block 1 heading'), ta('whyText', 'Block 1 text', 3),
    t('partnerTitle', 'Block 2 heading'), ta('partnerText', 'Block 2 text', 3), t('partnerCta', 'Block 2 button'),
    t('facultyTitle', 'Faculty heading'),
  ],
  defaults: {
    title: 'Learn Today, Lead Tomorrow.',
    sub: 'Syllabdosth is a skill-development platform from Karnataka. We teach practical crafts — tailoring, beauty, nail art, mehandi, embroidery and saree draping — and connect certified graduates with paying customers.',
    image: '',
    whyTitle: 'Why we exist', whyText: 'Skilled work pays — but only when people can find you and trust you. Our courses end with a practical assessment, and graduates who pass can list their services on Syllabdosth with a verified badge.',
    partnerTitle: 'Partner with us', partnerText: 'Franchise and training partners get our curriculum, trainer onboarding, certification and marketing support.', partnerCta: 'Become a partner',
    facultyTitle: 'Our faculty',
  },
};

const contact: ContentDef = {
  key: 'page.contact', title: 'Contact page', kind: 'page', viewPath: '/contact',
  description: 'Phone, WhatsApp and email come from Website Settings → General.',
  fields: [t('title', 'Heading', { full: true }), ta('sub', 'Text under the heading', 2), { name: 'topics', label: 'Topics in the form (one per line)', type: 'lines', full: true }, t('directTitle', 'Side box heading'), t('mapUrl', 'Google Maps link (optional)', { full: true })],
  defaults: { title: 'Talk to us', sub: 'Questions about a course, a booking or a partnership — we reply within one working day.', topics: ['Courses', 'A booking', 'Franchise / partnership', 'Something else'], directTitle: 'Reach us directly', mapUrl: '' },
};

const listingPages: ContentDef = {
  key: 'page.listings', title: 'Courses, services & blog pages', kind: 'page', viewPath: '/courses',
  fields: [
    group('courses', 'Courses page', [t('title', 'Heading', { full: true }), ta('sub', 'Text under the heading', 2)]),
    group('course', 'Single course page', [t('feeNote', 'Note under the fee', { full: true }), ta('moduleNote', 'Text inside each curriculum module', 2)]),
    group('services', 'Services page', [t('title', 'Heading', { full: true }), ta('sub', 'Text under the heading', 3), t('groupTitle', 'Group box heading', { full: true }), t('groupText', 'Group box text', { full: true })]),
    group('blog', 'Blog page', [t('title', 'Heading', { full: true }), t('sub', 'Text under the heading', { full: true })]),
    group('help', 'Help & FAQ page', [t('title', 'Heading', { full: true }), t('sub', 'Text under the heading', { full: true })]),
  ],
  defaults: {
    courses: { title: 'Courses worth certifying in', sub: 'Short and long programmes taught by working professionals. Every course ends with an industry-recognised certificate.' },
    course: { feeNote: 'EMI and scholarships available — ask when we call.', moduleNote: 'Live sessions, demonstrations and graded practice work for this module. Detailed lesson plan shared after enrolment.' },
    services: { title: 'Book a verified professional', sub: 'Certified professionals for beauty, tailoring, mehndi, draping and creative services. Choose a service, check the starting price and send a request — you pay nothing until the professional confirms.', groupTitle: 'Booking for a group or an event?', groupText: 'Bridal parties, office wellness days, college fests — we’ll plan the artists for you.' },
    blog: { title: 'From the blog', sub: 'Career tips and craft know-how from our faculty and team.' },
    help: { title: 'Help & FAQ', sub: '' },
  },
};

const footer: ContentDef = {
  key: 'page.footer', title: 'Footer', kind: 'page',
  fields: [t('line1', 'Big text, line 1'), t('line2', 'Big text, line 2'), ta('blurb', 'Short description', 2), t('bigWord', 'Large faded word'), t('bottomNote', 'Bottom line (right)', { full: true })],
  defaults: { line1: 'Learn today,', line2: 'Lead tomorrow.', blurb: 'Certified courses and verified professionals, in one place.', bigWord: 'Syllabdosth', bottomNote: '' },
};

const legal = (key: string, title: string, body: string[]): ContentDef => ({
  key, title, kind: 'page', viewPath: `/legal/${key.slice('page.'.length)}`,
  fields: [t('title', 'Heading', { full: true }), ta('body', 'Text (a blank line starts a new paragraph)', 18)],
  defaults: { title, body: body.join('\n\n') },
});

/* ------------------------------------------------------------------ settings */
const general: ContentDef = {
  key: 'settings.general', title: 'General settings', kind: 'settings',
  description: 'Your business details. Used in the header, footer, contact page, course pages and emails.',
  fields: [
    t('siteName', 'Site name', { required: true }), t('tagline', 'Tagline'),
    t('phone', 'Phone (as shown)'), t('whatsapp', 'WhatsApp number (with country code, digits only)', { placeholder: '919901884692' }),
    { name: 'email', label: 'Public email', type: 'email' }, t('site', 'Website address (as shown)'),
    ta('address', 'Address', 2),
    group('socials', 'Social media links', [
      { name: 'instagram', label: 'Instagram', type: 'url' }, { name: 'facebook', label: 'Facebook', type: 'url' },
      { name: 'youtube', label: 'YouTube', type: 'url' }, { name: 'linkedin', label: 'LinkedIn', type: 'url' },
    ]),
  ],
  defaults: { siteName: 'Syllabdosth', tagline: 'Learn Today, Lead Tomorrow.', phone: '+91 99018 84692', whatsapp: '919901884692', email: 'support@syllabdosth.com', site: 'www.syllabdosth.com', address: '', socials: { instagram: '', facebook: '', youtube: '', linkedin: '' } },
};

const branding: ContentDef = {
  key: 'settings.branding', title: 'Logo & branding', kind: 'settings',
  fields: [
    img('logoDark', 'Logo for light backgrounds', { help: 'Dark logo, transparent PNG or SVG.' }),
    img('logoLight', 'Logo for dark backgrounds', { help: 'White logo, transparent PNG or SVG. Also used in this admin panel.' }),
    img('favicon', 'Browser tab icon (favicon)', { help: 'Square PNG, 64×64 or larger.' }),
    { name: 'themeColor', label: 'Mobile browser bar colour', type: 'color' },
  ],
  defaults: { logoDark: '/logo-noir.png', logoLight: '/logo-white.png', favicon: '', themeColor: '#0B0B0B' },
};

const seo: ContentDef = {
  key: 'settings.seo', title: 'SEO', kind: 'settings', description: 'How the site appears on Google and when a link is shared on WhatsApp.',
  fields: [t('title', 'Site title', { full: true }), ta('description', 'Description (under 160 characters)', 3, { max: 300 }), t('keywords', 'Keywords (comma separated)', { full: true }), img('ogImage', 'Share image (1200×630)')],
  defaults: { title: 'Syllabdosth | Certified Skill Courses & Professional Services', description: 'Certified skill courses in tailoring, nail art, mehndi, saree draping and embroidery. Learn new skills and book verified professionals on Syllabdosth.', keywords: '', ogImage: '' },
};

const announcement: ContentDef = {
  key: 'settings.announcement', title: 'Announcement bar', kind: 'settings', description: 'A thin bar at the very top of every page, for offers and news.',
  fields: [{ name: 'enabled', label: 'Show the bar', type: 'bool' }, t('text', 'Text', { full: true }), t('linkLabel', 'Link text'), t('linkUrl', 'Link', { placeholder: '/courses' })],
  defaults: { enabled: false, text: 'Festive offer: 10% off all Master courses — use code FESTIVE10', linkLabel: 'See courses', linkUrl: '/courses' },
};

const maintenance: ContentDef = {
  key: 'settings.maintenance', title: 'Maintenance mode', kind: 'settings', description: 'Hides the website from visitors while you work. Admins can still see everything.',
  fields: [{ name: 'enabled', label: 'Turn on maintenance mode', type: 'bool' }, t('title', 'Heading', { full: true }), ta('message', 'Message', 3)],
  defaults: { enabled: false, title: 'We’ll be right back', message: 'Syllabdosth is getting an update. Please check back in a little while, or WhatsApp us for anything urgent.' },
};

const email: ContentDef = {
  key: 'settings.email', title: 'SMTP settings', kind: 'settings',
  description: 'Lets the website send emails (enquiry confirmations, notifications, ticket replies). Login and password-reset emails are sent by Supabase: set the same SMTP under Supabase → Authentication → SMTP.',
  fields: [
    { name: 'enabled', label: 'Send emails', type: 'bool' },
    t('host', 'SMTP host', { placeholder: 'smtp.zoho.in' }), { name: 'port', label: 'Port', type: 'number', int: true, min: 1, max: 65535 },
    { name: 'secure', label: 'Use SSL (port 465)', type: 'bool' },
    t('user', 'Username'), { name: 'pass', label: 'Password / app password', type: 'password' },
    t('fromName', 'From name'), { name: 'fromEmail', label: 'From email', type: 'email' },
    { name: 'adminEmail', label: 'Send admin alerts to', type: 'email' },
    { name: 'notifyAdmin', label: 'Email the admin about new enquiries, bookings and applications', type: 'bool' },
    { name: 'confirmToUser', label: 'Send confirmation emails to learners and customers', type: 'bool' },
  ],
  defaults: { enabled: false, host: '', port: 587, secure: false, user: '', pass: '', fromName: 'Syllabdosth', fromEmail: '', adminEmail: '', notifyAdmin: true, confirmToUser: true },
};

const sms: ContentDef = {
  key: 'settings.sms', title: 'SMS & OTP settings', kind: 'settings',
  description: 'Phone-number login (OTP) is sent by Supabase: switch it on in Supabase → Authentication → Providers → Phone and enter the same SMS provider there. The details below are kept for your records and SMS templates.',
  fields: [
    { name: 'provider', label: 'SMS provider', type: 'select', options: [{ value: 'none', label: 'Not set up' }, { value: 'msg91', label: 'MSG91 (India)' }, { value: 'twilio', label: 'Twilio' }, { value: 'vonage', label: 'Vonage' }, { value: 'textlocal', label: 'Textlocal' }] },
    t('senderId', 'Sender ID (6 letters)', { max: 11 }), { name: 'authKey', label: 'Auth key / API key', type: 'password' },
    t('dltEntityId', 'DLT principal entity ID'), { name: 'otpLength', label: 'OTP length', type: 'number', int: true, min: 4, max: 8 },
    ta('notes', 'Notes', 3),
  ],
  defaults: { provider: 'none', senderId: '', authKey: '', dltEntityId: '', otpLength: 6, notes: '' },
};

const addons: ContentDef = {
  key: 'settings.addons', title: 'Add-ons', kind: 'settings', description: 'Optional extras. Switch each on and fill in its details.',
  fields: [
    group('whatsapp', 'WhatsApp chat button', [{ name: 'enabled', label: 'Show a WhatsApp button on every page', type: 'bool' }, t('message', 'Pre-filled message', { full: true })]),
    group('analytics', 'Google Analytics', [{ name: 'enabled', label: 'On', type: 'bool' }, t('id', 'Measurement ID', { placeholder: 'G-XXXXXXXXXX' })]),
    group('pixel', 'Meta (Facebook) Pixel', [{ name: 'enabled', label: 'On', type: 'bool' }, t('id', 'Pixel ID', { placeholder: '1234567890' })]),
    group('ai', 'AI Assistant (Claude)', [{ name: 'enabled', label: 'On', type: 'bool' }, { name: 'apiKey', label: 'Anthropic API key', type: 'password', help: 'From console.anthropic.com → API keys. Or set ANTHROPIC_API_KEY on your server.' }, t('model', 'Model')]),
    group('payments', 'Online payments (Razorpay)', [{ name: 'note', label: 'Status', type: 'text', readonly: true }]),
  ],
  defaults: {
    whatsapp: { enabled: false, message: 'Hi Syllabdosth, I have a question about a course.' },
    analytics: { enabled: false, id: '' }, pixel: { enabled: false, id: '' },
    ai: { enabled: true, apiKey: '', model: 'claude-sonnet-5-5' },
    payments: { note: 'Not switched on yet. Ask your developer to connect Razorpay when you are ready to take fees online.' },
  },
};

export const CONTENT_DEFS: ContentDef[] = [
  home, about, contact, listingPages, footer,
  legal('page.terms', 'Terms of use', [
    'Last updated: 24 October 2026',
    'About these terms\nThese terms apply when you use www.syllabdosth.com, run by Syllabdosth, 1st floor K Mannyappa Garden, Ashirvad Colony, Horamavu, Bengaluru, Karnataka 560113. By using the website, creating an account, or sending an enquiry, enrolment or booking request, you agree to them. If you do not agree, please do not use the website.',
    'Using the website\nYou can use the website to learn about our courses and services, send enquiries, enrol on courses, request bookings and manage your account. We work to keep it available and accurate, but it may sometimes be unavailable or contain mistakes, and we may change or remove parts of it.',
    'Your account\nGive accurate details when you sign up and keep your login private. You are responsible for what is done with your account; tell us at once at support@syllabdosth.com if you think someone else has used it. We may suspend or close an account that breaks these terms.\nFor a learner under 18, a parent or guardian must give consent, and should make the booking or enrolment for them.',
    'Courses and enrolment\nSending the enrolment form is an enquiry, not a purchase. Our admissions team calls you, usually within one working day, to confirm your batch and the course fee.\nAn offer price shown on the website applies only to the course it is shown on, and only between the offer’s start and end dates.\nCourses end with a practical assessment. Each certificate has a public verification page, so anyone with its code can check that it is genuine.',
    'Professional bookings\nBookings connect you with independent, verified professionals. A booking request is not final until the professional confirms it. You can cancel your request from your booking page while it is pending or confirmed.\nIf you are not happy with a booking, contact support within 48 hours and we will review it with the professional.',
    'Group bookings, applications and franchise enquiries\nA group enquiry is a request: our team gets back to you with availability and pricing. Applying to teach, to list your services as a professional or to become a franchise partner does not guarantee acceptance. If you sign a separate agreement with us, for example a franchise agreement, that agreement also applies.',
    'Payments\nWe do not take card or bank payments on the website. Fees, and how and when to pay them, are confirmed with you before you pay.',
    'Cancellations and refunds\nCancellations and refunds are handled as described to you at the time of booking or enrolment, and as required by applicable law. For any question about a cancellation or refund, contact support@syllabdosth.com.',
    'Your conduct\nDo not give false information or someone else’s details, misuse the forms or reviews, harass professionals, learners or our team, try to get into accounts or admin areas that are not yours, or interfere with how the website works. Course reviews appear only after we approve them, and we may remove content that breaks these terms.',
    'Intellectual property\nThe website, its design, text, logos, images and course materials belong to Syllabdosth or the people who license them to us. You may use course materials for your own learning, but you must not copy, share or sell them without our written permission. When you post a review, you allow us to show it on the website.',
    'Limitation of liability\nWe provide the website and our services with reasonable care and skill. Professionals listed on the website are independent and are responsible for the services they provide. To the extent the law allows, we are not liable for indirect or unforeseeable loss, or for loss caused by events outside our reasonable control. Nothing in these terms limits any liability that cannot be limited by law, or your rights as a consumer.',
    'Privacy, cookies and analytics\nThe website uses necessary cookies to work, for example to keep you signed in. Optional analytics cookies are used only if you allow them, and rejecting them does not limit what you can do on the website. How we collect and use your personal details, and how to change your cookie choice at any time, is explained in our Privacy policy (/legal/privacy) and Cookie policy (/legal/cookies).',
    'Governing law\nThese terms are governed by the laws of India. The courts at Bengaluru, Karnataka have jurisdiction.',
    'Changes and contact\nWe may update these terms when the website or our services change. The latest version is always on this page. Questions: support@syllabdosth.com, or the Contact page.',
  ]),
  legal('page.privacy', 'Privacy policy', [
    'Last updated: 24 October 2026',
    'Who we are\nThis policy covers www.syllabdosth.com, run by Syllabdosth.\nAddress: 1st floor K Mannyappa Garden, Ashirvad Colony, Horamavu, Bengaluru, Karnataka 560113.\nQuestions about this policy or your data, and grievances about how we handle it: support@syllabdosth.com, or the Contact page.',
    'We collect your name, phone, email and booking details to provide courses and bookings, and we never sell your data.',
    'What we collect\n• When you create an account or log in (with email and password, a phone code or Google): your name, email address and/or phone number.\n• When you send a course enquiry, booking request, group enquiry, application or contact message: the details you enter, such as your name, phone, email, city, the course or service you chose, preferred dates and your message.\n• We do not take card or bank payments on the website. Course fees are confirmed by our team when they call you.',
    'What is shown publicly\n• Certificates: your name and certificate details appear on the certificate’s public verification page, which anyone with the code can open.\n• Course reviews: your name, rating and comment appear on the course page once we approve the review.\n• Verified professionals: the name, photo, city, bio and rating on your public profile.',
    'How we use it\nTo reply to your enquiry, arrange courses and bookings, run your account and dashboard, issue and verify certificates, send you emails about your enquiry or booking, and keep the website secure.',
    'Necessary cookies\nThese keep you signed in (cookies whose names start with sb-) and remember your cookie choice (sd_consent, kept for 6 months). They are always on because the website needs them to work, and they are not used to track you.',
    'Optional website analytics (our own)\nOnly if you accept analytics cookies, we set a random ID in your browser (sd_vid, kept for up to 12 months) and record:\n• which pages, courses and services are viewed;\n• words searched on the Courses page (in our own records only, never sent to Google);\n• whether a confirmation page was reached after an enquiry, booking request, group enquiry or application was sent (not what was in the form);\n• your device type (mobile, tablet or desktop) and browser type (for example Chrome or Safari, not the version);\n• the website or campaign link that brought you here, including the campaign name in that link;\n• how fast pages load and whether a page showed an error. These measurements hold only the page address, the timings and the device type, with no ID.\nThe ID is not linked to your account. We do not store your IP address, name, email, phone number, passwords, payment details or anything you type into forms. Search words that look like a phone number or email address are never shown.\nOnly our admin team can see the results, and only as totals, never one person’s activity. These records are deleted after 13 months.\nIf you reject analytics cookies, nothing about your visit is recorded for analytics and the website works normally.',
    'Google Analytics\nOnly if you accept analytics cookies, we may also use Google Analytics, a service from Google, to understand how the website is used. Google sets its own cookies (_ga, and one whose name starts with _ga_).\nWhat Google receives:\n• The address of each public page you view, with search words and other details removed. Only campaign tags (source, medium, campaign, content, ID) are kept from the link.\n• The page you came from, in the same cleaned form, or only the address of the other website.\n• General device and browser information (for example mobile or desktop, and the browser and operating system), and your approximate location at country and region level, which Google works out from your IP address. Google is set not to collect your city, your device’s make and model, detailed version numbers or screen size.\n• On public pages, how you use the page: whether you scroll to near the bottom of a page; the address of links to other websites that you click; when you start, play through or finish an embedded video, and its title and address; the name and address of files you download from links on the page.\nWhat Google doesn’t receive:\n• Anything from private pages, such as your dashboard, account or booking pages. Nothing is sent from them at all.\n• Your name, email, phone number, account details, search words or anything you type into forms. We don’t share any data you give us with Google, and Google’s collection of user-provided data is switched off.\n• Whether you start or send a form: form tracking is switched off.\nGoogle uses your IP address only to work out that approximate location; Google states that Google Analytics 4 does not log or store IP addresses.\nGoogle may process this data on servers outside India, under Google’s own terms and safeguards.\nGoogle Signals and advertising personalisation are switched off, so Google Analytics is not used for advertising.\nHow long Google keeps it: the record of each page view and action is kept for 2 months. Data linked to your Google Analytics ID is kept for 14 months after your last visit; each new visit starts the 14 months again.',
    'Advertising trackers\nWe do not use the Meta (Facebook) Pixel or other advertising trackers. If we add any, they will be listed in our Cookie policy and will only load after you allow them.',
    'Changing your choice\nUse “Cookie settings” at the bottom of any page, or the button on the Cookie policy page, to accept or reject optional cookies at any time.\nWhen you withdraw consent, our analytics and Google Analytics stop at once, and their cookies (sd_vid, _ga and the _ga_ cookie) are deleted from your browser. Other tabs of the website that are already open stop sending as soon as you use them again. Records made before that are not linked to your name or account and are deleted on the normal schedule. You can also clear cookies in your browser settings.',
    'Who helps us run the website\nThe website is hosted by Vercel. Our database, file storage and sign-in run on Supabase. If you log in with Google, Google handles that sign-in, and sign-in codes for phone login are sent by SMS through our sign-in provider. When email notifications are switched on, emails about enquiries and bookings are sent through our email provider. If you allow analytics cookies, Google Analytics (Google) measures how the website is used, as described above. These providers process data on our behalf, only to run these services for us.',
    'How long we keep it\n• Your cookie choice: 6 months. The analytics ID in your browser: up to 12 months.\n• Our analytics, page-speed and error records: 13 months.\n• Google Analytics cookies: up to 2 years; each visit starts the 2 years again. Google’s records: 2 months for each page view and action; 14 months after your last visit for data linked to your Google Analytics ID.\n• Account, enquiry, booking and application records: no longer than we need them, generally up to 365 days after our last activity with you (for an account, after it is closed or last used). We keep records longer only where the law requires it, for example tax and accounting records.',
    'Children\nFor a learner under 18, a parent or guardian must give consent, and should make the booking or enrolment for them. We do not knowingly collect a child’s personal details without that consent.',
    'Your rights\nYou can ask us to give you access to, correct or erase the personal details we hold about you. You can withdraw your consent at any time, and you can raise a grievance about how we handle your data.\nContact us at support@syllabdosth.com or through the Contact page. We aim to respond within 30 days.',
    'Governing law\nThis policy is governed by the laws of India. The courts at Bengaluru, Karnataka have jurisdiction.',
    'Changes to this policy\nWe may update this policy when the website changes. The latest version is always on this page.',
  ]),
  legal('page.cookies', 'Cookie policy', ['Last updated: 24 October 2026', 'This page explains the cookies Syllabdosth uses and how to change your choice. You can change or withdraw your consent at any time with the Cookie settings button below, or the Cookie settings link at the bottom of every page.', 'Necessary cookies (always on)\n• Sign-in cookies (names starting with sb-) keep you logged in.\n• sd_consent remembers your cookie choice for 6 months.\nThe website needs these to work. They are not used to track you.', 'Analytics cookies (only if you allow them)\n• sd_vid: our random ID, kept for up to 12 months, so we can count unique and returning visitors.\n• _ga, and one whose name starts with _ga_: set by Google Analytics, kept for up to 2 years (each visit starts the 2 years again), to count visitors and visits.\nWith these we record which pages, courses and services are viewed, words searched on the Courses page (our own records only, never sent to Google), whether a confirmation page was reached after a form was sent (not what was in it), your device and browser type, how fast pages load, and the website or campaign link that sent you here. On public pages, Google Analytics also records scrolling to near the bottom of a page, clicks on links to other websites, embedded video plays and file downloads.\nWe do not record your name, email, phone number, passwords, payment details or anything you type into forms, and the IDs are not linked to your account. Only our admin team sees our totals, never one person’s activity, and our records are deleted after 13 months. Google’s handling of Google Analytics data is explained in our Privacy policy.', 'Marketing cookies (only if you allow them)\nWe do not currently use marketing or advertising cookies. If we add the Meta Pixel (marketing), it will be listed here and will only load after you allow marketing cookies. Google Analytics is used only for analytics, with advertising features switched off.', 'If you reject optional cookies, the website works normally and nothing about your visit is recorded for analytics. For questions about your data, email support@syllabdosth.com or use the Contact page.']),
  general, branding, seo, announcement, maintenance, email, sms, addons,
];
export const CONTENT: Record<string, ContentDef> = Object.fromEntries(CONTENT_DEFS.map((d) => [d.key, d]));

/** URL segment ↔ key: /admin/cms/home ↔ page.home, /admin/settings/general ↔ settings.general */
export const contentKeyFromSlug = (kind: 'page' | 'settings', slug: string) => `${kind === 'page' ? 'page' : 'settings'}.${slug}`;
export const slugFromContentKey = (key: string) => key.split('.').slice(1).join('.');

/** Deep merge: saved values over defaults. Lists are replaced whole. */
export function mergeContent<T extends Row>(defaults: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
  const out: Row = { ...defaults };
  for (const [k, v] of Object.entries(saved as Row)) {
    const d = (defaults as Row)[k];
    out[k] = d && typeof d === 'object' && !Array.isArray(d) && v && typeof v === 'object' && !Array.isArray(v) ? mergeContent(d as Row, v) : v;
  }
  return out as T;
}

export const DEFAULT_HERO_PHOTO = heroPhotos.main.src;
export const imageFallback = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
export { photo };






