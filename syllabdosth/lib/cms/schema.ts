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
      footnotes: ['200+ certified courses across tailoring, beauty, nail art, mehandi, saree draping and embroidery.', 'Online and offline batches from Bengaluru, with a 30-day money-back guarantee on every course.'],
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
    testimonials: { eyebrow: 'Success stories', title: 'Learners who now run their own bookings', note: 'Sample testimonials and photos — replace with real learner quotes before launch.' },
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
    group('course', 'Single course page', [t('feeNote', 'Note under the fee', { full: true }), t('guarantee', 'Guarantee line', { full: true }), ta('moduleNote', 'Text inside each curriculum module', 2)]),
    group('services', 'Services page', [t('title', 'Heading', { full: true }), ta('sub', 'Text under the heading', 3), t('groupTitle', 'Group box heading', { full: true }), t('groupText', 'Group box text', { full: true })]),
    group('blog', 'Blog page', [t('title', 'Heading', { full: true }), t('sub', 'Text under the heading', { full: true })]),
    group('help', 'Help & FAQ page', [t('title', 'Heading', { full: true }), t('sub', 'Text under the heading', { full: true })]),
  ],
  defaults: {
    courses: { title: 'Courses worth certifying in', sub: 'Short and long programmes taught by working professionals. Every course ends with an industry-recognised certificate.' },
    course: { feeNote: 'EMI and scholarships available — ask when we call.', guarantee: '30-day money-back guarantee.', moduleNote: 'Live sessions, demonstrations and graded practice work for this module. Detailed lesson plan shared after enrolment.' },
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
  key, title, kind: 'page', viewPath: key === 'page.terms' ? '/legal/terms' : '/legal/privacy',
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
  defaults: { siteName: 'Syllabdosth', tagline: 'Learn Today, Lead Tomorrow.', phone: '+91 99018 84692', whatsapp: '919901884692', email: 'hello@syllabdosth.com', site: 'www.syllabdosth.com', address: '', socials: { instagram: '', facebook: '', youtube: '', linkedin: '' } },
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
  defaults: { title: 'Syllabdosth — Learn a craft. Book a master.', description: '200+ certified courses in tailoring, beautician, nail art, mehandi, embroidery and saree draping — plus verified professionals you can book in Bengaluru.', keywords: '', ogImage: '' },
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
  legal('page.terms', 'Terms of use', ['Placeholder — replace with your lawyer-approved terms before launch.', 'Covers course enrolment, booking requests between customers and independent professionals, cancellations, and acceptable use.']),
  legal('page.privacy', 'Privacy policy', ['Placeholder — replace with your final privacy policy before launch.', 'We collect your name, phone, email and booking details only to provide courses and bookings, and never sell your data.']),
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

