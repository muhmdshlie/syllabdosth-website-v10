/**
 * Sample content. Used when Supabase is not configured (demo mode) and mirrored in
 * supabase/seed.sql so the real database starts with the same catalogue.
 */
import type { BlogPost, Category, Course, Faculty, Faq, Module, Professional, Service } from './types';

export const categories: Category[] = [
  { slug: 'tailoring', name: 'Tailoring', tone: 'linear-gradient(135deg,#D9DFEE,#8FA0C8)' },
  { slug: 'beautician', name: 'Beautician Certification', tone: 'linear-gradient(135deg,#F1D3E3,#CF86B0)' },
  { slug: 'nail-art', name: 'Nail Art', tone: 'linear-gradient(135deg,#F6DDE9,#DE93BC)' },
  { slug: 'mehandi', name: 'Mehandi Design', tone: 'linear-gradient(135deg,#EFDDAE,#C3A04F)' },
  { slug: 'embroidery', name: 'Embroidery', tone: 'linear-gradient(135deg,#E3D8EF,#9C7DC2)' },
  { slug: 'saree-draping', name: 'Saree Draping', tone: 'linear-gradient(135deg,#DDE9D6,#8DAF7E)' },
];

export const faculty: Faculty[] = [
  { id: 'f-lakshmi', name: 'Lakshmi V.', initials: 'LV', specialty: 'Master Tailor', years: 15, students: 2100, bio: 'Runs a boutique in Jayanagar and has trained over 2,100 tailors in pattern drafting and bridal blouse work.' },
  { id: 'f-deepa', name: 'Deepa K.', initials: 'DK', specialty: 'Beautician', years: 12, students: 1500, bio: 'Certified cosmetologist and bridal artist. Leads the beautician certification track.' },
  { id: 'f-kavya', name: 'Kavya S.', initials: 'KS', specialty: 'Nail art', years: 8, students: 900, bio: 'Studio owner specialising in gel, chrome and hand-painted nail art.' },
  { id: 'f-anjali', name: 'Anjali R.', initials: 'AR', specialty: 'Mehandi', years: 10, students: 1200, bio: 'Bridal mehandi artist who takes 60+ weddings a season.' },
  { id: 'f-radha', name: 'Radha N.', initials: 'RN', specialty: 'Embroidery', years: 11, students: 640, bio: 'Aari and maggam work specialist for bridal blouses and lehengas.' },
  { id: 'f-meera', name: 'Meera T.', initials: 'MT', specialty: 'Saree draping', years: 9, students: 760, bio: 'Drapes for weddings and shoots in 12+ regional styles.' },
];

const levelFromDays = (d: number): Course['level'] =>
  d <= 3 ? 'Basic' : d <= 14 ? 'Foundation' : d <= 24 ? 'Certification' : d <= 45 ? 'Master' : d <= 90 ? 'Advanced' : 'Pro Master';

function modulesFor(days: number, business: boolean): Module[] {
  if (days <= 3) return [
    { title: 'Tools, materials & safety', days: 1 },
    { title: 'Core techniques', days: 1 },
    { title: 'Practice piece & review', days: 1 },
  ];
  const parts = business
    ? ['Fundamentals', 'Core Techniques', 'Applied Practice', 'Refinement & Finishing', 'Business & Portfolio Skills']
    : ['Fundamentals', 'Core Techniques', 'Applied Practice', 'Refinement & Finishing'];
  const weights = business ? [0.25, 0.3, 0.25, 0.12, 0.08] : [0.3, 0.3, 0.25, 0.15];
  let left = days;
  return parts.map((p, i) => {
    const d = i === parts.length - 1 ? left : Math.max(1, Math.round(days * weights[i]));
    left -= d;
    return { title: `Module ${i + 1} — ${p}`, days: d };
  });
}

const outcomesByCat: Record<string, string[]> = {
  tailoring: ['Hand and machine stitching fundamentals', 'Pattern drafting for blouses, salwars & dresses', 'Fitting, alteration & garment finishing', 'Fabric selection and cutting techniques', 'Boutique pricing & order management', 'Portfolio-building for client work'],
  beautician: ['Skin analysis and facial treatments', 'Threading, waxing and hygiene standards', 'Party and HD makeup', 'Hair styling basics', 'Client consultation & aftercare', 'Pricing and running a home salon'],
  'nail-art': ['Nail prep, shaping and cuticle care', 'Gel polish and extensions', 'Chrome, ombré and hand-painted art', 'Tool sterilisation and safety', 'Speed techniques for salon work', 'Pricing your first clients'],
  mehandi: ['Cone making and paste consistency', 'Traditional and Arabic patterns', 'Bridal full-hand and feet layouts', 'Dark-stain aftercare advice', 'Speed techniques for events', 'Getting bridal bookings'],
  embroidery: ['Hand embroidery stitches', 'Aari and maggam work', 'Bead, sequin and zardosi finishing', 'Tracing and transferring designs', 'Blouse and lehenga layouts', 'Costing custom orders'],
  'saree-draping': ['12 regional draping styles', 'Pre-pleating and box-folding', 'Quick event draping under 30 minutes', 'Pinning for comfort and movement', 'Draping for photo shoots', 'Building a draping clientele'],
};

const facultyByCat: Record<string, string> = {
  tailoring: 'f-lakshmi', beautician: 'f-deepa', 'nail-art': 'f-kavya', mehandi: 'f-anjali', embroidery: 'f-radha', 'saree-draping': 'f-meera',
};

type Seed = [cat: string, title: string, days: number, price: number, featured?: boolean];
const seeds: Seed[] = [
  ['tailoring', 'Tailoring Master Pro (180 Days)', 180, 49999],
  ['tailoring', 'Tailoring Advanced Master Class (90 Days)', 90, 29999],
  ['tailoring', 'Tailoring Pro Class (60 Days)', 60, 19999],
  ['tailoring', 'Tailoring Master Class (30 Days)', 30, 8999],
  ['tailoring', 'Tailoring Foundation Course (14 Days)', 14, 1999],
  ['tailoring', 'Tailoring Basic Course (3 Days)', 3, 999],
  ['beautician', 'Beautician Master Pro (180 Days)', 180, 59999],
  ['beautician', 'Beautician Master Expert (90 Days)', 90, 39999],
  ['beautician', 'Beautician Pro Class (60 Days)', 60, 25999],
  ['beautician', 'Beautician Master Class (30 Days)', 30, 9999],
  ['nail-art', 'Nail Art Pro Master (90 Days)', 90, 24999],
  ['nail-art', 'Nail Art Master Class (45 Days)', 45, 12999],
  ['nail-art', '24 Days Nail Art Certification Course', 24, 6999, true],
  ['nail-art', 'Nail Art Foundation Course (10 Days)', 10, 2999],
  ['nail-art', 'Nail Art Basic Course (3 Days)', 3, 999],
  ['mehandi', 'Bridal Mehandi Master Pro (90 Days)', 90, 19999, true],
  ['mehandi', 'Mehandi Master Class (45 Days)', 45, 9999],
  ['mehandi', 'Mehandi Foundation Course (14 Days)', 14, 3999],
  ['mehandi', 'Mehandi Basic Course (3 Days)', 3, 999],
  ['embroidery', 'Embroidery Master Pro (90 Days)', 90, 19999, true],
  ['embroidery', 'Embroidery Master Class (45 Days)', 45, 9999],
  ['embroidery', 'Embroidery Foundation Course (14 Days)', 14, 3999],
  ['embroidery', 'Embroidery Basic Course (3 Days)', 3, 999],
  ['saree-draping', 'Saree Draping: 12 Styles (42 Days)', 42, 5400, true],
  ['saree-draping', 'Saree Draping Basic Course (3 Days)', 3, 999],
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const courses: Course[] = seeds.map(([cat, title, days, price, featured], i) => {
  const catName = categories.find((c) => c.slug === cat)!.name;
  const long = days >= 30;
  return {
    id: `c-${i + 1}`,
    slug: slugify(title),
    title,
    category_slug: cat,
    level: levelFromDays(days),
    duration_days: days,
    price,
    mode: days <= 14 ? 'Online' : 'Online & offline',
    language: 'English, Hindi, Kannada',
    rating: Math.round((4.5 + ((i * 7) % 5) / 10) * 10) / 10,
    ratings_count: 80 + ((i * 53) % 300),
    students: 300 + ((i * 197) % 1700),
    summary: `${days}-day ${catName.toLowerCase()} programme with hands-on practice and an industry-recognised certificate.`,
    description: `A structured ${catName.toLowerCase()} programme covering ${outcomesByCat[cat].slice(0, 3).map((o) => o.toLowerCase()).join(', ')}. Every module has practice assignments graded by faculty${long ? ', and you finish with a portfolio you can show clients' : ''}.`,
    outcomes: outcomesByCat[cat],
    modules: modulesFor(days, long),
    faculty_id: facultyByCat[cat],
    featured: !!featured,
  };
});

export const services: Service[] = [
  { id: 's-bridal-makeup', slug: 'bridal-makeup', title: 'Bridal Makeup', category: 'Beauty', initials: 'BM', summary: 'Professional bridal makeup for weddings, receptions and special occasions.', description: 'Includes a consultation call, HD base, lashes and a finish that lasts through the ceremony and photos.', price_from: 2500, duration: '2–3 hours' },
  { id: 's-nail-art', slug: 'nail-art', title: 'Nail Art', category: 'Beauty', initials: 'NA', summary: 'Clean, detailed nail art for everyday looks, events and celebrations.', description: 'Gel, chrome and hand-painted sets at a partner studio or at your home.', price_from: 800, duration: '1–2 hours' },
  { id: 's-beautician', slug: 'beautician-at-home', title: 'Beautician at Home', category: 'Beauty', initials: 'BE', summary: 'Beauty care and grooming delivered by trained professionals.', description: 'Facials, threading, waxing and clean-ups at your home with salon-grade hygiene.', price_from: 500, duration: '1–2 hours' },
  { id: 's-mehndi-occasions', slug: 'mehndi-for-occasions', title: 'Mehndi for Occasions', category: 'Art & Craft', initials: 'MO', summary: 'Traditional and contemporary mehndi for festivals, parties and celebrations.', description: 'Quick, elegant designs for festivals, sangeet and family functions.', price_from: 500, duration: '1–3 hours' },
  { id: 's-bridal-mehndi', slug: 'bridal-mehndi', title: 'Bridal Mehndi', category: 'Art & Craft', initials: 'BH', summary: 'Detailed bridal mehndi designs for hands and feet, customised for your occasion.', description: 'Traditional and modern bridal designs, timed around your muhurtam, with dark-stain aftercare guidance.', price_from: 4500, duration: '3–5 hours' },
  { id: 's-saree-draping', slug: 'saree-draping', title: 'Saree Draping', category: 'Fashion', initials: 'SD', summary: 'Elegant saree draping for weddings, functions, shoots and special events.', description: 'Pre-pleated or freehand draping in 12 regional styles, done in under 30 minutes.', price_from: 900, duration: '30–45 min' },
  { id: 's-blouse-stitching', slug: 'blouse-stitching', title: 'Blouse Stitching', category: 'Tailoring', initials: 'BS', summary: 'Custom-fit blouses with designer necks and sleeves.', description: 'Measurements at home or studio, one trial fitting, delivered in 5–7 days.', price_from: 1200, duration: '5–7 days' },
  { id: 's-aari-embroidery', slug: 'aari-embroidery', title: 'Aari Embroidery', category: 'Tailoring', initials: 'AE', summary: 'Hand aari and maggam work on blouses, lehengas and dupattas.', description: 'Custom motifs traced to your outfit, with bead and zardosi finishing.', price_from: 1800, duration: '7–10 days' },
];

export const professionals: Professional[] = [
  { id: 'p-ananya', slug: 'ananya-makeup-studio', name: 'Ananya Makeup Studio', initials: 'AM', title: 'Bridal makeup artist', city: 'Bengaluru', rating: 4.9, bookings_count: 120, service_ids: ['s-bridal-makeup'], bio: 'Syllabdosth-certified bridal artist specialising in HD and airbrush makeup.', verified: true },
  { id: 'p-priya', slug: 'priya-mehndi-arts', name: 'Priya Mehndi Arts', initials: 'PM', title: 'Mehndi artist', city: 'Bengaluru', rating: 4.8, bookings_count: 210, service_ids: ['s-bridal-mehndi', 's-mehndi-occasions'], bio: 'Bridal and Arabic mehndi, known for fine detailing and dark stains.', verified: true },
  { id: 'p-lavanya', slug: 'lavanya-beauty-studio', name: 'Lavanya Beauty Studio', initials: 'LB', title: 'Beautician', city: 'Bengaluru', rating: 4.9, bookings_count: 120, service_ids: ['s-beautician'], bio: 'At-home facials and grooming with salon-grade hygiene.', verified: true },
  { id: 'p-meera', slug: 'meera-nail-lounge', name: 'Meera Nail Lounge', initials: 'MN', title: 'Nail artist', city: 'Bengaluru', rating: 4.7, bookings_count: 95, service_ids: ['s-nail-art'], bio: 'Gel, chrome and hand-painted sets at studio or home.', verified: true },
  { id: 'p-kavya', slug: 'kavya-drapes', name: 'Kavya Drapes', initials: 'KD', title: 'Saree draping artist', city: 'Bengaluru', rating: 4.9, bookings_count: 160, service_ids: ['s-saree-draping'], bio: 'Drapes for weddings and shoots in 12 regional styles.', verified: true },
  { id: 'p-lakshmi', slug: 'lakshmi-tailoring', name: 'Lakshmi Tailoring', initials: 'LT', title: 'Tailor & embroiderer', city: 'Bengaluru', rating: 4.8, bookings_count: 140, service_ids: ['s-blouse-stitching', 's-aari-embroidery'], bio: 'Designer blouses and aari work with one trial fitting.', verified: true },
];

export const blogPosts: BlogPost[] = [
  {
    slug: 'turn-mehandi-hobby-into-business', title: 'How to turn a mehandi hobby into a full-time business', category: 'Career', author: 'Anjali R.', read_mins: 6, published_at: '2026-08-12',
    excerpt: 'From your first paid booking to a full wedding season — what actually works.',
    intro: 'Most of our mehandi graduates start with family functions. The ones who go full-time do three things differently.',
    sections: [
      { heading: '1. Build a portfolio before you charge', text: 'Photograph every design in natural light, front and back of the hand. Twenty strong photos beat a hundred average ones.' },
      { heading: '2. Price by the hour, quote by the event', text: 'Know your hourly number, then quote clients a single event price. It is easier for them to say yes.' },
      { heading: '3. Get listed where brides search', text: 'Certified graduates can join the Syllabdosth professional network and receive booking requests directly.' },
    ],
    quote: 'Your first ten clients come from people who already know you. Your next hundred come from your portfolio.',
  },
  {
    slug: 'saree-draping-styles-wedding-season', title: '5 saree draping styles to know this wedding season', category: 'Trends', author: 'Meera T.', read_mins: 4, published_at: '2026-09-02',
    excerpt: 'The drapes clients are asking for most — and when to suggest each one.',
    intro: 'Wedding season brings every kind of request. These five drapes cover most of them.',
    sections: [
      { heading: '1. Classic Nivi drape', text: 'Clean pleats and a neat pallu. Works with almost every fabric and is the safest choice for long ceremonies.' },
      { heading: '2. Gujarati seedha pallu', text: 'The pallu comes to the front to show off heavy borders and embroidery.' },
      { heading: '3. Bengali-inspired drape', text: 'A distinctive silhouette with broad pleats. Works well when you want a more traditional statement.' },
      { heading: '4. Contemporary open-pallu style', text: 'A lighter, modern look that keeps the details of the saree visible.' },
      { heading: '5. Pre-pleated or structured drape', text: 'For busy wedding days, a pre-pleated drape makes getting ready faster and keeps the look neat all day.' },
    ],
    quote: 'The best saree drape is one that complements the fabric, occasion and comfort of the person wearing it.',
  },
  {
    slug: 'nail-art-certification-worth-it', title: 'What actually makes a nail art certification worth it', category: 'Certification', author: 'Kavya S.', read_mins: 5, published_at: '2026-09-18',
    excerpt: 'Five questions to ask before you pay for any nail art course.',
    intro: 'Not every certificate helps you get clients. Here is what to look for.',
    sections: [
      { heading: 'Is there graded practice?', text: 'You should be assessed on real sets, not just attendance.' },
      { heading: 'Does it teach hygiene properly?', text: 'Sterilisation and safe product use protect your clients and your reputation.' },
      { heading: 'Does it lead to work?', text: 'Look for courses that connect you with paying clients after you graduate.' },
    ],
  },
];

export const faqs: Faq[] = [
  { q: 'Are the certificates recognised?', a: 'Yes. Every course ends with an industry-recognised Syllabdosth certificate, and graduates can apply to join our verified professional network.' },
  { q: 'Can I learn online?', a: 'Most courses run online and offline. Short courses (up to 14 days) are fully online; longer programmes combine live online classes with centre practice.' },
  { q: 'What happens if I\'m not happy with a booking?', a: 'Contact support within 48 hours. We review every complaint with the professional and arrange a redo or refund where appropriate.' },
  { q: 'Do I need equipment before I start a course?', a: 'No. Your first-week kit list is shared after enrolment, and starter kits are available at partner centres.' },
  { q: 'Is there a refund policy for courses?', a: 'Yes — a 30-day money-back guarantee if the course isn\'t right for you.' },
  { q: 'Which cities is Syllabdosth available in?', a: 'Courses are available online across India. Professional bookings are currently live in Bengaluru, with more Karnataka cities coming soon.' },
];

export const stats = [
  { value: '200+', label: 'Certified courses' },
  { value: '20k+', label: 'Learners trained' },
  { value: '450+', label: 'Verified professionals' },
  { value: '4.9★', label: 'Average booking rating' },
];

export const gallery = [
  { label: 'Bridal mehandi', tone: 'linear-gradient(135deg,#EFDDAE,#C3A04F)' },
  { label: 'Nail art, chrome set', tone: 'linear-gradient(135deg,#F6DDE9,#DE93BC)' },
  { label: 'Saree draping', tone: 'linear-gradient(135deg,#DDE9D6,#8DAF7E)' },
  { label: 'Aari embroidery', tone: 'linear-gradient(135deg,#E3D8EF,#9C7DC2)' },
  { label: 'Blouse tailoring', tone: 'linear-gradient(135deg,#D9DFEE,#8FA0C8)' },
  { label: 'Bridal makeup', tone: 'linear-gradient(135deg,#F1D3E3,#CF86B0)' },
];

