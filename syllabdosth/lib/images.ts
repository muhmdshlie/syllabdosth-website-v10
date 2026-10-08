// Every photo on the site comes from this file.
// All photos are from Unsplash and free for commercial use under the Unsplash License
// (https://unsplash.com/license). No attribution is required, but credits are kept below.
//
// To use your OWN photo instead: put the file in /public (e.g. /public/photos/tailoring.jpg)
// and replace the id with the path, e.g. tailoring: '/photos/tailoring.jpg'.
// Anything uploaded from the admin panel (course covers, category/service/blog/faculty photos,
// CMS page images) always wins over these built-in photos.

const P = {
  // Your own photos (in /public/photos)
  tailorAtelier: '/photos/tailoring-atelier.jpg',
  tailorSewing: '/photos/tailoring-sewing.jpg',
  // Reference photos you sent (from the web). Keep only if you have permission from the owner;
  // otherwise replace before launch. One carries a "Cine Love" watermark.
  refSaree: '/photos/saree-draping-hd.jpg', // AI-upscaled (Real-ESRGAN 4x) from saree-draping-studio.jpg
  refNailBoho: '/photos/nail-art-boho.jpg',
  refNailChrome: '/photos/nail-art-chrome.jpg',
  refMehandiGeo: '/photos/mehandi-geometric.jpg',
  refMehandiSage: '/photos/mehandi-pearl-sage.jpg',
  refBridalHands: '/photos/bridal-mehandi-hands.jpg',
  refBridalLehenga: '/photos/bridal-mehandi-lehenga.jpg',
  refBeautyBridal: '/photos/beautician-bridal.jpg',
  refBeautyGlam: '/photos/beautician-glam.jpg',
  tailorCutting: '1718184021018-d2158af6b321', // SIL Group
  sewingMachine: '1618587194716-40490bdba417', // Tomáš Petz
  tapeScissors: '1536867520774-5b4f2628a69b', // pina messina
  makeupArtist: '1709477542149-f4e0e21d590b', // Lola Azizada
  brideGold: '1610173827043-9db50e0d8ef9', // Alok Verma
  brideVeil: '1600685890506-593fdf55949b', // Aayush Rawat
  nailsNavyGold: '1754799670312-8e7da8e40ad7', // Ari Kurniawan
  nailsTortoise: '1604654894610-df63bc536371', // Bryony Elena
  nailsPattern: '1754951661104-2a13d50d4741', // Kambria Trout — hand-painted teal/orange pattern
  nailsJewel: '1777287216954-2b4b22bb6bf2', // de Aura — metallic, jewelled nails
  nailsChrome: '1773808605530-17926a0463e9', // Kellen Barnes — intricate silver chrome
  mehndiHand: '1566576055886-92607b215181', // Mee Nee
  mehndiArtist: '1752824250540-b5c8387f1ad0', // Vidit Goswami
  embroideryColour: '1671535108620-d169ce916f09', // Ksenia Yakovleva
  embroideryHoop: '1765218305153-aef09f3dd4fb', // Aneta Pawlik
  handStitching: '1568288796918-03e7d93306bd', // Elio Santos
  sareeRed: '1628477116196-48afe0d209e0', // Prateek Jaiswal
  sareeBridal: '1769500804057-ca1391bf4617', // Rejaul Karim
  sareeStudio: '1610030469983-98e550d6193c', // Bulbul Ahmed — warm studio, silk + gold
  sareeGreen: '1609748340041-f5d61e061ebc', // Bulbul Ahmed — green silk saree
  sareeGold: '1617627143750-d86bc21e42bb', // Sabesh Photography — silk + gold jewellery
  bridePurple: '1641699862936-be9f49b1c38d', // Bella Pon Fruitsia — bridal, gold jewellery
  // editorial studio set (warm light, silk + gold) — matches the brand mood board
  sareeGreenSilk: '1679006831648-7c9ea12e5807', // Sabesh Photography
  sareeRedGoldStudio: '1716504627981-22728cb2d2e2', // Ricky Shirke
  headpieceStudio: '1716504628084-97224213ca6d', // Ricky Shirke
  blackGoldStudio: '1716504628204-47f2df8d2634', // Ricky Shirke
  sareeRedGold: '1617633150878-7df1d12a9a57',
  goldNecklace: '1694062045776-f48d9b6de57e',
  handsJewellery: '1673413348184-102e17df237c', // Akash Gurle
  sareePortrait: '1727430228383-aa1fb59db8bf',
} as const;

type PhotoKey = keyof typeof P;

/** Build an image URL. Accepts a photo key, an Unsplash id, or a local/remote path. */
export function photo(src: PhotoKey | string, width = 800): string {
  const id = (P as Record<string, string>)[src] ?? src;
  if (id.startsWith('/') || id.startsWith('http')) return id;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`;
}

const byCategory: Record<string, PhotoKey[]> = {
  tailoring: ['tailorAtelier', 'tailorSewing'],
  beautician: ['refBeautyBridal', 'refBeautyGlam', 'makeupArtist', 'headpieceStudio'],
  'nail-art': ['refNailBoho', 'refNailChrome', 'nailsJewel', 'nailsPattern'],
  mehandi: ['refMehandiSage', 'refMehandiGeo', 'refBridalLehenga', 'refBridalHands'],
  embroidery: ['embroideryColour', 'embroideryHoop', 'handStitching'],
  'saree-draping': ['refSaree', 'sareeGreenSilk', 'sareeRedGoldStudio', 'sareePortrait'],
};

function pick<T>(list: T[], seed: string): T {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** Category photo: the one uploaded in Admin → Course → Categories, else the built-in one. */
export function categoryPhoto(slug: string, width?: number, uploaded?: string | null) {
  if (uploaded) return uploaded;
  return photo((byCategory[slug] ?? ['sareeBridal'])[0], width);
}

/** Course cover: course's own image → its category's uploaded photo → built-in photo. */
export function coursePhoto(course: { slug: string; category_slug: string; image_url?: string | null }, width?: number, categoryImage?: string | null) {
  if (course.image_url) return course.image_url;
  if (categoryImage) return categoryImage;
  return photo(pick(byCategory[course.category_slug] ?? ['sareeBridal'], course.slug), width);
}

const byService: Record<string, PhotoKey> = {
  'bridal-makeup': 'refBeautyBridal',
  'nail-art': 'refNailChrome',
  'beautician-at-home': 'refBeautyGlam',
  'mehndi-for-occasions': 'refMehandiGeo',
  'bridal-mehndi': 'refBridalLehenga',
  'saree-draping': 'refSaree',
  'blouse-stitching': 'tailorSewing',
  'aari-embroidery': 'embroideryColour',
};
export function servicePhoto(slug: string, width?: number, uploaded?: string | null) {
  if (uploaded) return uploaded;
  return photo(byService[slug] ?? 'brideVeil', width);
}

const byPost: Record<string, PhotoKey> = {
  'turn-mehandi-hobby-into-business': 'refMehandiSage',
  'saree-draping-styles-wedding-season': 'refSaree',
  'nail-art-certification-worth-it': 'refNailBoho',
};
export function blogPhoto(slug: string, width?: number, uploaded?: string | null) {
  if (uploaded) return uploaded;
  return photo(byPost[slug] ?? 'handStitching', width);
}

/** Home page hero collage */
export const heroPhotos = {
  main: {
    src: photo('refSaree'),
    alt: 'Four women in silk sarees with gold temple jewellery',
    depth: '/photos/saree-draping-depth.png', // depth map for the 3D effect (white = near)
    focus: [0.5, 0] as [number, number], // anchor to the top so their faces are always in frame
  },
  a: { src: photo('refMehandiSage', 600), alt: 'Modern mehandi with pearl details' },
  b: { src: photo('refNailBoho', 500), alt: 'Hand-painted teal and terracotta nail art' },
  c: { src: photo('refBeautyBridal', 600), alt: 'Makeup artist doing bridal makeup' },
};

/** Home page "A closer look at the craft" gallery */
export const galleryPhotos = [
  { label: 'Saree draping', src: photo('refSaree', 900) },
  { label: 'Nail art', src: photo('refNailChrome', 700) },
  { label: 'Bridal mehandi', src: photo('refBridalLehenga', 700) },
  { label: 'Hand embroidery', src: photo('embroideryColour', 700) },
  { label: 'Bridal makeup', src: photo('refBeautyGlam', 800) },
  { label: 'Tailoring', src: photo('tailorAtelier', 700) },
];

/** Crafts shown in the scrolling ribbon under the hero */
export const craftRibbon = ['Tailoring', 'Nail art', 'Bridal mehandi', 'Saree draping', 'Aari embroidery', 'Bridal makeup', 'Blouse stitching', 'Beautician'];

// ------------------------------------------------------------------ profile pictures (DPs)
// PLACEHOLDERS: free Unsplash portraits of models, not the real people named on the site.
// Replace with real faculty / learner photos (with their permission) before launch.
function portrait(id: string, size = 240) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=75`;
}
const facultyDp: Record<string, string> = {
  LV: '1774850235906-f5eaafb425ac', // white blazer, studio — Skytech Aviation
  DK: '1768221677463-191fc4e15690', // bright smile, pearl earrings — IMANA
  AR: '1646979201225-00e36437d09e', // red shawl, warm smile — Anil Sharma
  KS: '1628726987013-db899232027c', // studio headshot, dark backdrop — Vishal Bhutani
  MT: '/photos/faculty-meera.jpg', // cropped from the HD saree shoot — swap for a real faculty photo
  RN: '1637589267610-6c66fc2a086b', // grey coat, confident — Fotos
};
export function facultyPhoto(initials: string, size?: number, uploaded?: string | null) {
  if (uploaded) return uploaded;
  const id = facultyDp[initials];
  if (!id) return undefined;
  return id.startsWith('/') ? id : portrait(id, size);
}
export const testimonialPhotos: Record<string, string> = {
  AR: portrait('1759840278361-f1adc75529a1'),
  FS: portrait('1552113125-81af17f36b57'),
  KP: portrait('1463335361701-e90f4c5045d0'),
};
export const heroBadgePhoto = portrait('1759840278326-73f26ae8c5c7', 120);

// ------------------------------------------------------------------ scroll story (home page)
// Pinned centrepiece + giant word + glass callouts, in the style of the reference video.
export type StoryCallout = { img: string; title: string; text: string };
export type StoryScene = { word: string; eyebrow: string; line: string; center: { src: string; alt: string }; callouts: StoryCallout[] };
export const craftStory: StoryScene[] = [
  {
    word: 'Learn', eyebrow: '01 · Learn', line: '200+ certified courses across six crafts.',
    center: { src: photo('refSaree', 900), alt: 'Women in silk sarees with gold jewellery' },
    callouts: [
      { img: photo('tailorAtelier', 200), title: 'Tailoring', text: 'Pattern drafting to blouse design' },
      { img: photo('refNailChrome', 200), title: 'Nail art', text: 'Chrome, gel and hand-painted' },
      { img: photo('refMehandiGeo', 200), title: 'Mehandi', text: 'Modern and traditional designs' },
      { img: photo('refBeautyGlam', 200), title: 'Beautician', text: 'Skin, makeup and hair' },
    ],
  },
  {
    word: 'Create', eyebrow: '02 · Create', line: 'Practical from day one: real clients, real work.',
    center: { src: photo('refBridalLehenga', 900), alt: 'Bride showing full-arm bridal mehandi' },
    callouts: [
      { img: photo('refMehandiSage', 200), title: 'Hands-on classes', text: 'Practise on real designs every week' },
      { img: photo('refBridalHands', 200), title: 'Client scenarios', text: 'Bridal, party and everyday looks' },
      { img: photo('tailorSewing', 200), title: 'Kit list included', text: 'Know exactly what to buy' },
      { img: photo('refNailBoho', 200), title: 'Online & offline', text: 'Pick the batch that suits you' },
    ],
  },
  {
    word: 'Master', eyebrow: '03 · Master', line: 'Taught by professionals who still take bookings.',
    center: { src: photo('refBeautyBridal', 900), alt: 'Makeup artist doing bridal makeup' },
    callouts: [
      { img: photo('refBeautyGlam', 200), title: 'Working faculty', text: 'Learn from active professionals' },
      { img: photo('refNailChrome', 200), title: 'Live sessions', text: 'Weekly feedback on your work' },
      { img: photo('tailorAtelier', 200), title: 'Practical assessment', text: 'Prove the skill, not just theory' },
      { img: photo('refSaree', 200), title: 'Certificate', text: 'Industry-recognised on completion' },
    ],
  },
  {
    word: 'Earn', eyebrow: '04 · Earn', line: 'Get listed and start taking paid bookings.',
    center: { src: photo('tailorAtelier', 900), alt: 'Designer fitting a garment on a dress form' },
    callouts: [
      { img: photo('refBridalLehenga', 200), title: 'Verified profile', text: 'Your certificate goes live' },
      { img: photo('refBeautyBridal', 200), title: 'Bookings near you', text: 'Get matched with local clients' },
      { img: photo('refSaree', 200), title: 'Events & groups', text: 'Weddings, parties and workshops' },
      { img: photo('refMehandiGeo', 200), title: 'Partner with us', text: 'Franchise and training-partner options' },
    ],
  },
];
