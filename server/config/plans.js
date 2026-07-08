/**
 * Vendor subscription plans (India-only marketplace, prices in INR).
 * A vendor must hold an active subscription to create listings.
 */
export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    priceINR: 599,
    listingLimit: 25,
    analytics: 'summary',
    prioritySupport: false,
    featuredShop: false,
    homepagePromotion: false,
    tagline: 'Up to 25 listings, standard shop',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceINR: 999,
    listingLimit: 100,
    analytics: 'full',
    prioritySupport: true,
    featuredShop: false,
    homepagePromotion: false,
    tagline: 'Up to 100 listings, analytics, priority support',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    priceINR: 1999,
    listingLimit: Infinity,
    analytics: 'premium',
    prioritySupport: true,
    featuredShop: true,
    homepagePromotion: true,
    tagline: 'Unlimited listings, featured shop, homepage promotion, premium analytics',
  },
}

export const PLAN_IDS = Object.keys(PLANS)

/** Serializable version for API responses (Infinity -> null = unlimited) */
export function planForApi(id) {
  const p = PLANS[id]
  if (!p) return null
  return { ...p, listingLimit: p.listingLimit === Infinity ? null : p.listingLimit }
}

/** Indian states + union territories for location validation */
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]
