import mongoose from 'mongoose'
import User from '../models/User.js'
import VendorProfile from '../models/VendorProfile.js'
import Pigeon from '../models/Pigeon.js'
import Category from '../models/Category.js'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import Notification from '../models/Notification.js'
import Post from '../models/Post.js'
import Advertisement from '../models/Advertisement.js'

const IMG = (name) => `/images/pigeons/${name}.png`
const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n) => new Date(Date.now() + n * DAY)

const CATEGORIES = [
  { name: 'High-Flying', slug: 'high-flying', icon: 'wind', description: 'Endurance high flyers - Rampoori, Teddy and traditional kit birds' },
  { name: 'Racing', slug: 'racing', icon: 'trophy', description: 'Homing pigeons bred for speed and endurance racing' },
  { name: 'Show', slug: 'show', icon: 'sparkles', description: 'Show and ornamental breeds - Modena, Frillback and more' },
  { name: 'Breeding', slug: 'breeding', icon: 'award', description: 'Proven breeding pairs and foundation stock' },
  { name: 'Other', slug: 'other', icon: 'bird', description: 'Everything else - pets, garden birds and rare varieties' },
]

// India-only marketplace: 5 vendors across major Indian cities.
// Plans: elite (featured shop + homepage promotion), pro, basic.
const VENDORS = [
  { name: 'Arjun Banerjee', email: 'arjun@demo.pigeono.com', storeName: 'Kolkata Kabootar Khana', city: 'Kolkata', state: 'West Bengal', pincode: '700016', landmark: 'Near Park Street', plan: 'elite', desc: 'Four-generation Kolkata loft famous for Kalsiray and Lalsiray high flyers. Our birds rule the winter sky championships.', rating: 4.9, reviewCount: 124, totalSales: 89 },
  { name: 'Salman Qureshi', email: 'salman@demo.pigeono.com', storeName: 'Purani Dilli Pigeon House', city: 'Delhi', state: 'Delhi', pincode: '110006', landmark: 'Near Jama Masjid, Old Delhi', plan: 'pro', desc: 'Old Delhi kabootarbaazi tradition since 1962. Champion Teddy and Rampoori kits flown from our haveli rooftop.', rating: 4.7, reviewCount: 58, totalSales: 41 },
  { name: 'Rohan Deshmukh', email: 'rohan@demo.pigeono.com', storeName: 'Mumbai Racing Lofts', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', landmark: 'Bandra West', plan: 'elite', desc: 'Premier racing loft with imported Janssen and Vandenabeele bloodlines acclimatized for Indian conditions. Full pedigree documentation.', rating: 4.8, reviewCount: 92, totalSales: 67 },
  { name: 'Raj Patel', email: 'raj@demo.pigeono.com', storeName: 'Patel Heritage Birds', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', landmark: 'Near Sabarmati riverfront', plan: 'basic', desc: 'Traditional high-flying and heritage-breed pigeons. Family loft for over 40 years.', rating: 4.5, reviewCount: 29, totalSales: 18 },
  { name: 'Meera Srivastava', email: 'meera@demo.pigeono.com', storeName: 'Awadh Fancy Aviary', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', landmark: 'Hazratganj', plan: 'pro', desc: 'Award-winning Modena, Frillback and fancy breeds. Show-ready birds raised with nawabi care in the heart of Awadh.', rating: 4.6, reviewCount: 37, totalSales: 25 },
]

function listings(vendorProfiles) {
  const [kolkata, delhi, mumbai, patel, lucknow] = vendorProfiles
  const HEALTH_OK = { vaccinated: true, vaccineDetails: 'PMV-1 and pox, annual booster current', lastVetCheck: new Date('2026-05-15') }
  const loc = (v) => ({ city: v.city, state: v.state, country: 'India', pincode: v.pincode, landmark: v.landmark, pickupOnly: false })
  const V = Object.fromEntries(vendorProfiles.map((p, i) => [p._id, VENDORS[i]]))
  const at = (profile, extra = {}) => ({ ...loc(V[profile._id]), ...extra })

  return [
    // Kolkata Kabootar Khana (Elite — featured/homepage promoted)
    { vendorId: kolkata._id, title: 'Champion Kalsiray Male — Winter Sky Winner', breed: 'Kalsiray', category: 'high-flying', age: '3 years', gender: 'male', color: 'Black & White', price: 18500, currency: 'INR', negotiable: false, isFeatured: true, health: HEALTH_OK, description: 'Winner of the 2025 Kolkata winter sky championship with 11 hours 40 minutes airtime. From our foundation Kalsiray line kept pure for four generations. Exceptional pitch and kit discipline.', media: { photos: [IMG('highflyer-tippler')] }, pedigree: { fatherLineage: 'Foundation cock "Kaala Badshah" line', motherLineage: 'Championship kit hen 2019', ringNumber: 'IN-WB-2023-4471', isVerified: true }, racingRecord: [{ raceName: 'Kolkata Winter Sky Championship', date: new Date('2025-12-20'), distance: 'Endurance', position: 1, speed: '11h 40m airtime' }], location: at(kolkata), status: 'active', views: 342, inquiries: 18 },
    { vendorId: kolkata._id, title: 'Lalsiray Female — Proven Kit Bird', breed: 'Lalsiray', category: 'high-flying', age: '1.5 years', gender: 'female', color: 'Red & White', price: 9500, currency: 'INR', negotiable: true, isFeatured: true, health: { vaccinated: true, vaccineDetails: 'PMV-1 current' }, description: 'Beautiful Lalsiray hen with excellent kitting discipline. Flies consistently 7-9 hours with the kit. Calm temperament, settles quickly in a new loft.', media: { photos: [IMG('highflyer-white')] }, pedigree: { fatherLineage: 'Lalsiray champion line', motherLineage: 'Park Street kit hen', ringNumber: 'IN-WB-2024-2210', isVerified: false }, racingRecord: [], location: at(kolkata), status: 'active', views: 175, inquiries: 9 },
    { vendorId: kolkata._id, title: 'Young Abluk Trio — Foundation Stock', breed: 'Abluk', category: 'high-flying', age: '6 months', gender: 'unknown', color: 'Mottle', price: 12000, currency: 'INR', stock: 3, isFeatured: true, health: { vaccinated: false }, description: 'Three young Abluk from our best breeding pairs. Unflown, ready to train. Sold as a trio to start a competitive kit in your mohalla.', media: { photos: [IMG('highflyer-tippler')] }, pedigree: { fatherLineage: 'Abluk import pair 7', motherLineage: 'Abluk import pair 7', ringNumber: 'IN-WB-2025-5501', isVerified: false }, racingRecord: [], location: at(kolkata, { pickupOnly: true }), status: 'active', views: 132, inquiries: 6 },

    // Purani Dilli Pigeon House (Pro)
    { vendorId: delhi._id, title: 'Champion Teddy — 16hr Flight Record', breed: 'Teddy', category: 'high-flying', age: '2.5 years', gender: 'male', color: 'Dark Mottle', price: 15500, currency: 'INR', isFeatured: false, health: HEALTH_OK, description: 'Personal best 16 hours 10 minutes in competition conditions flown from our Old Delhi rooftop. From proven Teddy lines. Exceptional kitting behaviour and altitude.', media: { photos: [IMG('highflyer-tippler')] }, pedigree: { fatherLineage: 'Jama Masjid 14hr line', motherLineage: 'Champion kit import', ringNumber: 'IN-DL-2023-4471', isVerified: true }, racingRecord: [{ raceName: 'Delhi Endurance Fly', date: new Date('2025-11-10'), distance: 'Endurance', position: 1, speed: '16h 10m airtime' }], location: at(delhi), status: 'active', views: 289, inquiries: 15 },
    { vendorId: delhi._id, title: 'White Rampoori Female — Purani Dilli Line', breed: 'Rampoori', category: 'high-flying', age: '1.5 years', gender: 'female', color: 'White', price: 8000, currency: 'INR', negotiable: true, health: { vaccinated: true, vaccineDetails: 'PMV-1 current' }, description: 'Pure white Rampoori from the old haveli line. Consistent 8-10 hour flyer with the kit. Hardy bird accustomed to Delhi summers.', media: { photos: [IMG('highflyer-white')] }, pedigree: { fatherLineage: 'White Star endurance line', motherLineage: 'Haveli champion kit', ringNumber: 'IN-DL-2024-2210', isVerified: false }, racingRecord: [], location: at(delhi), status: 'active', views: 168, inquiries: 8 },
    { vendorId: delhi._id, title: 'Sialkoti Pair — Championship Strain', breed: 'Sialkoti', category: 'breeding', age: '2 years', gender: 'pair', color: 'Mottle', price: 22000, currency: 'INR', negotiable: true, stock: 2, health: HEALTH_OK, description: 'Proven Sialkoti breeding pair producing consistent championship youngsters. Sold together only.', media: { photos: [IMG('highflyer-tippler')] }, pedigree: { fatherLineage: 'Sialkoti foundation 2018', motherLineage: 'Sialkoti foundation 2019', ringNumber: 'IN-DL-2023-8871', isVerified: true }, racingRecord: [], location: at(delhi, { pickupOnly: true }), status: 'active', views: 121, inquiries: 6 },

    // Mumbai Racing Lofts (Elite — featured/homepage promoted)
    { vendorId: mumbai._id, title: 'Homing Blue Bar Male — 500km Race Winner', breed: 'Homing', category: 'racing', age: '3 years', gender: 'male', color: 'Blue Bar', price: 45000, currency: 'INR', negotiable: false, isFeatured: true, health: HEALTH_OK, description: 'Won 1st at the Mumbai-Nashik 500km race against 800 birds. Imported Janssen bloodline fully acclimatized to Indian conditions. Exceptional muscle tone and wing quality.', media: { photos: [IMG('racing-blue-bar')] }, pedigree: { fatherLineage: 'Janssen import via Belgium', motherLineage: 'Golden Lady line', ringNumber: 'IN-MH-2023-6112', isVerified: true }, racingRecord: [{ raceName: 'Mumbai-Nashik Classic', date: new Date('2025-12-14'), distance: '500 km', position: 1, speed: '1485 m/min' }, { raceName: 'Pune Federation Sprint', date: new Date('2025-11-20'), distance: '320 km', position: 4, speed: '1512 m/min' }], location: at(mumbai), status: 'active', views: 364, inquiries: 19 },
    { vendorId: mumbai._id, title: 'Red Checker Female — Vandenabeele Line', breed: 'Homing', category: 'racing', age: '2 years', gender: 'female', color: 'Red Checker', price: 32000, currency: 'INR', negotiable: true, isFeatured: true, health: HEALTH_OK, description: 'Direct daughter of our Vandenabeele import pair. Proven breeder — her first-round youngsters placed in the top 10% of club races. Ideal foundation hen.', media: { photos: [IMG('racing-red-checker')] }, pedigree: { fatherLineage: 'Vandenabeele direct import', motherLineage: 'Bandra loft foundation hen', ringNumber: 'IN-MH-2024-6109', isVerified: true }, racingRecord: [], location: at(mumbai), status: 'active', views: 218, inquiries: 11 },
    { vendorId: mumbai._id, title: 'Young Grizzle Male — Sprint Line', breed: 'Homing', category: 'racing', age: '10 months', gender: 'male', color: 'Grizzle', price: 14000, currency: 'INR', isFeatured: true, health: { vaccinated: true, vaccineDetails: 'PMV-1 as youngster' }, description: 'Fast-maturing young male from our sprint family. Strong orientation on training tosses to 120km. Ready for the young bird season.', media: { photos: [IMG('racing-grizzle')] }, pedigree: { fatherLineage: 'Sprint King line', motherLineage: 'Van Loon hen import', ringNumber: 'IN-MH-2025-6120', isVerified: false }, racingRecord: [{ raceName: 'Training Toss Lonavala', date: new Date('2026-02-02'), distance: '120 km', position: 3, speed: '1390 m/min' }], location: at(mumbai), status: 'active', views: 156, inquiries: 7 },
    { vendorId: mumbai._id, title: 'Stock Pair — Proven Producers', breed: 'Homing', category: 'breeding', age: '3 years', gender: 'pair', color: 'Blue Check', price: 55000, currency: 'INR', negotiable: true, stock: 2, isFeatured: true, health: HEALTH_OK, description: 'Established stock pair, proven producers. Their 2025 youngsters won 3 club firsts. Sold together only. Pedigree charts for both birds.', media: { photos: [IMG('racing-blue-bar')] }, pedigree: { fatherLineage: 'Janssen Bliksem line', motherLineage: 'Jan Aarden Dolle line', ringNumber: 'IN-MH-2023-2776', isVerified: true }, racingRecord: [], location: at(mumbai, { pickupOnly: true }), status: 'active', views: 187, inquiries: 10 },

    // Patel Heritage Birds (Basic)
    { vendorId: patel._id, title: 'Madrasi High Flyer Male — Traditional Line', breed: 'Madrasi', category: 'high-flying', age: '2 years', gender: 'male', color: 'White', price: 14500, currency: 'INR', negotiable: true, health: { vaccinated: true, vaccineDetails: 'PMV-1 current', lastVetCheck: new Date('2026-04-02') }, description: 'From our 40-year family line of traditional high flyers. Consistent 7-9 hour flyer with beautiful high pitch. Hardy and low-maintenance.', media: { photos: [IMG('highflyer-white')] }, pedigree: { fatherLineage: 'Heritage line, 4 generations documented', motherLineage: 'Heritage line', ringNumber: 'IN-GJ-2023-9982', isVerified: false }, racingRecord: [], location: at(patel), status: 'active', views: 167, inquiries: 9 },
    { vendorId: patel._id, title: 'Young Laldumma — Pet & Garden Quality', breed: 'Laldumma', category: 'other', age: '7 months', gender: 'unknown', color: 'White & Red', price: 7500, currency: 'INR', health: { vaccinated: false }, description: 'Friendly young Laldumma, hand-raised and very tame. Ideal garden aviary bird or first pigeon for a new fancier.', media: { photos: [IMG('fancy-fantail')] }, pedigree: { fatherLineage: 'Garden line', motherLineage: 'Garden line', ringNumber: 'IN-GJ-2025-1120', isVerified: false }, racingRecord: [], location: at(patel, { pickupOnly: true }), status: 'active', views: 88, inquiries: 3 },
    { vendorId: patel._id, title: 'Kamagar Heritage Pair — 40-Year Line', breed: 'Kamagar', category: 'breeding', age: '2 years', gender: 'pair', color: 'Mottle', price: 21000, currency: 'INR', negotiable: true, stock: 2, health: { vaccinated: true, vaccineDetails: 'PMV-1 current', lastVetCheck: new Date('2026-03-18') }, description: 'Documented heritage pair — pure Kamagar line maintained for four decades. For fanciers preserving traditional breeds.', media: { photos: [IMG('highflyer-tippler')] }, pedigree: { fatherLineage: 'Heritage foundation cock 1998 line', motherLineage: 'Heritage foundation hen line', ringNumber: 'IN-GJ-2023-8871', isVerified: true }, racingRecord: [], location: at(patel), status: 'active', views: 109, inquiries: 4 },

    // Awadh Fancy Aviary (Pro)
    { vendorId: lucknow._id, title: 'Show Modena — Grand Champion Line', breed: 'Modena', category: 'show', age: '1 year', gender: 'male', color: 'White', price: 12500, currency: 'INR', health: HEALTH_OK, description: 'Stunning white Modena from our All-India Champion bloodline. Perfect type and carriage. Show-ready condition.', media: { photos: [IMG('fancy-fantail')] }, pedigree: { fatherLineage: 'AIC "Snowstorm" 2023', motherLineage: 'Best of Breed hen, Lucknow Show 2024', ringNumber: 'IN-UP-2025-0871', isVerified: true }, racingRecord: [], location: at(lucknow), status: 'active', views: 226, inquiries: 12 },
    { vendorId: lucknow._id, title: 'Black Frillback — Show Quality Curls', breed: 'Frillback', category: 'show', age: '18 months', gender: 'female', color: 'Black', price: 16000, currency: 'INR', health: HEALTH_OK, description: 'Exceptional curl development across wing shields. Placed 2nd at the North India show. Calm, well-handled bird accustomed to show cages.', media: { photos: [IMG('fancy-jacobin')] }, pedigree: { fatherLineage: 'Imported German show line', motherLineage: 'Best Frillback, North India 2023', ringNumber: 'IN-UP-2024-0442', isVerified: true }, racingRecord: [], location: at(lucknow), status: 'active', views: 198, inquiries: 8 },
    { vendorId: lucknow._id, title: 'Modena Breeding Pair — Proven', breed: 'Modena', category: 'breeding', age: '2 years', gender: 'pair', color: 'White', price: 24000, currency: 'INR', negotiable: true, stock: 2, health: { vaccinated: true, vaccineDetails: 'PMV-1 and pox current' }, description: 'Proven breeding pair producing consistent show-quality youngsters. Excellent parents that feed well. Sold as a pair only.', media: { photos: [IMG('fancy-fantail')] }, pedigree: { fatherLineage: 'Snowstorm grandson', motherLineage: 'Champion hen line', ringNumber: 'IN-UP-2023-0512', isVerified: false }, racingRecord: [], location: at(lucknow, { pickupOnly: true }), status: 'active', views: 121, inquiries: 6 },

    // Pending approval examples (visible only in vendor/admin dashboards)
    { vendorId: mumbai._id, title: 'New Import — Blue Check Female', breed: 'Homing', category: 'racing', age: '1 year', gender: 'female', color: 'Blue Check', price: 26000, currency: 'INR', health: { vaccinated: true }, description: 'Fresh import awaiting listing approval. Full pedigree to follow.', media: { photos: [IMG('racing-blue-bar')] }, pedigree: { ringNumber: 'IN-MH-2025-6122', isVerified: false }, racingRecord: [], location: at(mumbai), status: 'pending_approval', views: 0, inquiries: 0 },
    { vendorId: lucknow._id, title: 'Frillback Youngster — Red', breed: 'Frillback', category: 'show', age: '4 months', gender: 'unknown', color: 'Red', price: 9000, currency: 'INR', health: { vaccinated: false }, description: 'Young red frillback awaiting approval. Promising curl development.', media: { photos: [IMG('fancy-jacobin')] }, pedigree: { ringNumber: 'IN-UP-2025-0901', isVerified: false }, racingRecord: [], location: at(lucknow), status: 'pending_approval', views: 0, inquiries: 0 },
  ]
}

const REVIEW_TEXTS = [
  { rating: 5, comment: 'Bird arrived healthy and exactly as described. Pedigree paperwork was complete. Outstanding seller.' },
  { rating: 5, comment: 'Second purchase from this loft. Communication was excellent and the bird settled quickly.' },
  { rating: 4, comment: 'Great quality bird. Transport took a day longer than expected but the seller kept me informed.' },
  { rating: 5, comment: 'The pedigree verification gave me real confidence. Bird is even better in person.' },
  { rating: 4, comment: 'Healthy, well-conditioned bird. Would buy from this store again.' },
]

const POSTS = [
  {
    title: 'A Beginner\u2019s Guide to Kabootarbaazi: Starting Your First Kit',
    excerpt: 'Everything a new fancier needs to know before buying their first high-flying pigeons — loft setup, feeding, and training basics.',
    body: 'Kabootarbaazi — the traditional sport of pigeon flying — has been part of Indian rooftop culture for centuries, from the havelis of Old Delhi to the paras of North Kolkata.\n\nBefore you buy your first birds, get the basics right:\n\n1. Loft setup: A dry, airy loft with morning sun. Bamboo and wire mesh work well for Indian summers. Allow one square foot per bird minimum.\n\n2. Start with a settled kit: Buy 5-8 young birds from a single loft so they already kit together. Mixed-source kits take months longer to settle.\n\n3. Feeding: A base of bajra and wheat, with kangni as a training reward. Fresh water twice daily in summer.\n\n4. Training: Start with short liberations near the loft at dawn. Increase airtime gradually — never push young birds past their fitness.\n\n5. Health: Vaccinate against PMV-1 before the flying season. Quarantine any new bird for two weeks.\n\nBuy from approved sellers with health records — every vendor on Pigeono is admin-verified, and escrow protects your payment until the bird arrives healthy.',
    coverImage: IMG('highflyer-tippler'),
    status: 'published',
    daysAgo: 12,
  },
  {
    title: 'How Escrow Protects Pigeon Buyers and Sellers in India',
    excerpt: 'Understand how Pigeono\u2019s escrow system holds your payment safely until the bird arrives healthy at your door.',
    body: 'Buying a champion bird from another city used to mean risk on both sides. The buyer feared paying for a bird that never arrived; the seller feared dispatching a bird and chasing payment.\n\nPigeono\u2019s escrow flow removes that risk:\n\n1. You pay online when you place the order. The money is held by the platform — the seller does not receive it yet.\n\n2. Our team arranges trusted transport for the bird after the order is confirmed, with tracking shared in your dashboard.\n\n3. When the bird arrives, you confirm receipt within 72 hours. Only then is the payment released to the seller.\n\n4. If something is wrong, open a dispute — payment stays frozen until our team reviews the case.\n\nThis simple flow has made long-distance bird transactions safe for hundreds of fanciers across India.',
    coverImage: IMG('racing-blue-bar'),
    status: 'published',
    daysAgo: 6,
  },
  {
    title: 'Monsoon Care: Keeping Your Loft Healthy in the Wet Season',
    excerpt: 'Dampness is the biggest enemy of Indian lofts. Practical monsoon-proofing steps from senior fanciers.',
    body: 'The monsoon months are the most dangerous time of year for Indian lofts. Damp bedding, wet feed, and stagnant water breed disease faster than any other season.\n\nSenior fanciers from Mumbai and Kolkata share their monsoon checklist:\n\n1. Raise the loft floor: Even six inches off the ground keeps rising damp away from bedding.\n\n2. Cover feed: Store bajra and wheat in sealed steel drums. Wet feed grows fungus within a day.\n\n3. Change water twice daily: Warm humid weather turns waterers into bacteria farms.\n\n4. Cut flying time: Fly birds only in clear morning windows. A soaked kit bird can be lost or grounded far from home.\n\n5. Watch droppings daily: Loose green droppings are the first sign of trouble. Isolate early, treat fast.\n\nA dry loft is a healthy loft. An hour of monsoon-proofing saves a season of losses.',
    coverImage: IMG('highflyer-white'),
    status: 'published',
    daysAgo: 2,
  },
]

/** Seeds demo data only if the database is empty. Also exported as a standalone script. */
export async function seedIfEmpty() {
  const userCount = await User.estimatedDocumentCount()
  if (userCount > 0) {
    console.log('[pigeono] Database already seeded, skipping')
    return
  }
  console.log('[pigeono] Seeding demo data...')

  await Category.insertMany(CATEGORIES)

  // Admins
  const [admin1] = await User.create([
    { name: 'Admin One', email: 'admin1@pigeono.com', password: 'AdminPass123!', roles: ['admin', 'buyer'], isVerified: true },
    { name: 'Admin Two', email: 'admin2@pigeono.com', password: 'AdminPass123!', roles: ['admin', 'buyer'], isVerified: true },
  ])

  // Demo buyer with a saved address
  const buyer = await User.create({
    name: 'Bella Buyer',
    email: 'buyer@pigeono.com',
    password: 'BuyerPass123!',
    roles: ['buyer'],
    isVerified: true,
    addresses: [
      { label: 'Home', fullName: 'Bella Buyer', phone: '9812345670', line1: '14, Lake Gardens', city: 'Kolkata', state: 'West Bengal', pincode: '700045', landmark: 'Opposite Lake Gardens post office' },
    ],
  })

  // Vendors + stores with subscriptions
  const vendorProfiles = []
  const vendorUsers = []
  for (const v of VENDORS) {
    const user = await User.create({
      name: v.name,
      email: v.email,
      password: 'VendorPass123!',
      roles: ['buyer', 'vendor'],
      isVerified: true,
    })
    const planPrice = { basic: 599, pro: 999, elite: 1999 }[v.plan]
    const startedAt = daysFromNow(-20)
    const periodEnd = daysFromNow(10)
    const profile = await VendorProfile.create({
      userId: user._id,
      storeName: v.storeName,
      storeSlug: v.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      storeDescription: v.desc,
      status: 'approved',
      rating: v.rating,
      reviewCount: v.reviewCount,
      totalSales: v.totalSales,
      payoutDetails: {
        upiId: `${v.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '')}@okhdfc`,
        phoneNumber: '9820011223',
        accountHolderName: v.name,
      },
      subscription: {
        plan: v.plan,
        status: 'active',
        startedAt,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        history: [
          { plan: v.plan, amount: planPrice, paidAt: startedAt, reference: `mock_sub_${v.plan}_${user._id}`, periodEnd },
        ],
      },
    })
    user.vendorProfile = profile._id
    await user.save()
    vendorProfiles.push(profile)
    vendorUsers.push(user)
  }

  const pigeons = await Pigeon.insertMany(listings(vendorProfiles))
  const active = pigeons.filter((p) => p.status === 'active')

  // ------------------------------------------------------------------
  // Orders in various direct-payment states (buyer pays vendor directly)
  // ------------------------------------------------------------------
  const mkOrder = (pigeon, opts = {}) => {
    const vendor = vendorProfiles.find((v) => v._id.equals(pigeon.vendorId))
    return {
      buyerId: buyer._id,
      vendorId: vendor._id,
      pigeonId: pigeon._id,
      itemSnapshot: { title: pigeon.title, breed: pigeon.breed, price: pigeon.price, photo: pigeon.media.photos[0] },
      totalAmount: pigeon.price,
      delivery: {
        method: 'shipping',
        address: { fullName: 'Bella Buyer', line1: '14, Lake Gardens', city: 'Kolkata', state: 'West Bengal', postalCode: '700045', country: 'India', phone: '9812345670' },
      },
      vendorPaymentDetails: {
        upiId: `${vendor.storeSlug || 'vendor'}@okhdfc`,
        phoneNumber: '9820011223',
      },
      ...opts.fields,
    }
  }

  // 1. Completed order — buyer paid vendor via UPI, vendor confirmed
  const completedPigeon = active.find((p) => p.title.includes('Red Checker Female'))
  const completedOrder = await Order.create({
    ...mkOrder(completedPigeon),
    status: 'completed',
    paymentStatus: 'confirmed',
    vendorPaymentMethod: 'upi',
    transport: { status: 'delivered', partnerName: 'BlueDart Live Animal Express', contactPhone: '9820011223', trackingNumber: 'BD-449812345-IN', assignedAt: daysFromNow(-14) },
    timeline: [
      { status: 'pending', by: 'buyer', note: 'Order placed — pay the seller directly', at: daysFromNow(-15) },
      { status: 'payment_marked', by: 'buyer', note: 'Buyer marked payment as sent (UPI)', at: daysFromNow(-15) },
      { status: 'confirmed_by_vendor', by: 'vendor', note: 'Seller confirmed payment received', at: daysFromNow(-14) },
      { status: 'transport_assigned', by: 'admin', note: 'Transport arranged: BlueDart Live Animal Express (BD-449812345-IN)', at: daysFromNow(-14) },
      { status: 'completed', by: 'buyer', note: 'Buyer confirmed the bird arrived healthy', at: daysFromNow(-10) },
    ],
  })

  // 2. Vendor-confirmed order, transport in progress — Kolkata loft
  const transitPigeon = active.find((p) => p.title.includes('Champion Teddy'))
  await Order.create({
    ...mkOrder(transitPigeon),
    status: 'confirmed_by_vendor',
    paymentStatus: 'confirmed',
    vendorPaymentMethod: 'bank_transfer',
    transport: { status: 'in_transit', partnerName: 'Gati Animal Logistics', contactPhone: '9910022334', trackingNumber: 'GT-88123401-IN', assignedAt: daysFromNow(-3) },
    timeline: [
      { status: 'pending', by: 'buyer', note: 'Order placed — pay the seller directly', at: daysFromNow(-4) },
      { status: 'payment_marked', by: 'buyer', note: 'Buyer marked payment as sent (bank transfer)', at: daysFromNow(-4) },
      { status: 'confirmed_by_vendor', by: 'vendor', note: 'Seller confirmed payment received', at: daysFromNow(-3) },
      { status: 'transport_assigned', by: 'admin', note: 'Transport arranged: Gati Animal Logistics (GT-88123401-IN)', at: daysFromNow(-3) },
    ],
  })

  // 3. New order — buyer says they paid, waiting for vendor confirmation
  const awaitingPigeon = active.find((p) => p.title.includes('Show Modena'))
  await Order.create({
    ...mkOrder(awaitingPigeon),
    status: 'pending',
    paymentStatus: 'paid_by_buyer',
    vendorPaymentMethod: 'upi',
    transport: { status: 'awaiting_assignment' },
    timeline: [
      { status: 'pending', by: 'buyer', note: 'Order placed — pay the seller directly', at: daysFromNow(-1) },
      { status: 'payment_marked', by: 'buyer', note: 'Buyer marked payment as sent (UPI)', at: daysFromNow(-1) },
    ],
  })

  // ------------------------------------------------------------------
  // Reviews spread across active listings
  // ------------------------------------------------------------------
  const reviews = active.slice(0, 10).map((p, i) => ({
    buyerId: buyer._id,
    vendorId: p.vendorId,
    pigeonId: p._id,
    ...REVIEW_TEXTS[i % REVIEW_TEXTS.length],
  }))
  reviews[0].orderId = completedOrder._id
  await Review.insertMany(reviews)

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  await Notification.create([
    { userId: buyer._id, type: 'transport', title: 'Transport arranged', body: 'Gati Animal Logistics will deliver your order — tracking GT-88123401-IN.', link: '/dashboard/orders', isRead: false },
    { userId: buyer._id, type: 'order', title: 'Your bird is on the way', body: 'Shipped via Gati Animal Logistics — tracking GT-88123401-IN', link: '/dashboard/orders', isRead: false },
    { userId: buyer._id, type: 'order', title: 'Order placed', body: 'Pay the seller directly for Show Modena — Grand Champion Line using the payment details on your order page.', link: '/dashboard/orders', isRead: true },
    { userId: vendorUsers[2]._id, type: 'order', title: 'Order completed', body: 'Buyer confirmed delivery of Red Checker Female — Vandenabeele Line.', link: '/dashboard/vendor/orders', isRead: false },
    { userId: admin1._id, type: 'contact', title: 'Contact form: Question about vendor approval', body: 'From Faisal Ahmed (faisal@example.com): How long does vendor approval usually take?', isRead: false },
  ])

  // ------------------------------------------------------------------
  // Blog posts + advertisements
  // ------------------------------------------------------------------
  await Post.insertMany(
    POSTS.map((p) => ({
      title: p.title,
      slug: p.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80),
      excerpt: p.excerpt,
      body: p.body,
      coverImage: p.coverImage,
      status: p.status,
      publishedAt: daysFromNow(-p.daysAgo),
      authorId: admin1._id,
    }))
  )

  await Advertisement.insertMany([
    { title: 'Premium Pigeon Feed — 20% Off First Order', image: '/images/ad-pigeon-feed.png', linkUrl: '/search', placement: 'home_banner', active: true },
    { title: 'Sell Your Birds on Pigeono — Plans from ₹599/mo', image: '/images/ad-sell-birds.png', linkUrl: '/become-vendor', placement: 'search_sidebar', active: true },
  ])

  console.log(
    `[pigeono] Seeded ${CATEGORIES.length} categories, ${VENDORS.length + 3} users, ${vendorProfiles.length} stores (with subscriptions), ${pigeons.length} listings, 3 orders, ${reviews.length} reviews, ${POSTS.length} posts, 2 ads`
  )
}

// Allow running standalone: `pnpm --dir server seed`
const isDirectRun = process.argv[1] && process.argv[1].endsWith('seed.js')
if (isDirectRun) {
  const { connectDB } = await import('../config/db.js')
  await connectDB()
  await seedIfEmpty()
  await mongoose.disconnect()
  process.exit(0)
}
