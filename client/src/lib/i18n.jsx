import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Lightweight i18n for Pigeono — English, Hindi, Bengali.
 * The language choice is a UI preference persisted in localStorage.
 * Usage: const { t, lang, setLang } = useLang(); t('nav.browse')
 */

const DICTIONARIES = {
  en: {
    'nav.home': 'Home',
    'nav.browse': 'Browse',
    'nav.messages': 'Messages',
    'nav.orders': 'Orders',
    'nav.wishlist': 'Wishlist',
    'nav.cart': 'Cart',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin',
    'nav.sales': 'Sales',
    'nav.myStore': 'My Store',
    'nav.becomeVendor': 'Become a Vendor',
    'nav.logout': 'Log out',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'nav.searchPlaceholder': 'Search by breed, title or bloodline...',
    'hero.badge': 'Admin-verified pedigrees',
    'hero.title': "India's trusted marketplace for champion pigeons",
    'hero.subtitle':
      'Buy and sell racing, fancy and high-flyer pigeons from verified lofts across India — deal directly with trusted sellers and admin-checked pedigrees.',
    'hero.cta.browse': 'Browse pigeons',
    'hero.cta.sell': 'Start selling',
    'home.categories': 'Shop by category',
    'home.trending': 'Trending birds',
    'home.lofts': 'Featured lofts',
    'home.loftsSub': 'Premium verified breeders on Pigeono',
    'home.how': 'How Pigeono works',
    'home.stat.escrow': 'Direct seller payments',
    'home.stat.verified': 'Admin-verified pedigrees',
    'home.stat.lofts': 'Trusted lofts across India',
    'home.stat.transport': 'Live bird transport',
    'home.cta.title': 'Ready to find your next champion?',
    'home.cta.sub': 'Join thousands of fanciers buying and selling verified birds across India.',
    'footer.tagline': 'The trusted marketplace for verified pedigree pigeons in India.',
    'footer.buy': 'Buy',
    'footer.sell': 'Sell',
    'footer.company': 'Company',
    'footer.about': 'About us',
    'footer.blog': 'Blog',
    'footer.contact': 'Contact',
    'common.viewAll': 'View all',
  },
  hi: {
    'nav.home': 'होम',
    'nav.browse': 'ब्राउज़ करें',
    'nav.messages': 'संदेश',
    'nav.orders': 'ऑर्डर',
    'nav.wishlist': 'विशलिस्ट',
    'nav.cart': 'कार्ट',
    'nav.notifications': 'सूचनाएं',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.admin': 'एडमिन',
    'nav.sales': 'बिक्री',
    'nav.myStore': 'मेरी दुकान',
    'nav.becomeVendor': 'विक्रेता बनें',
    'nav.logout': 'लॉग आउट',
    'nav.login': 'लॉग इन',
    'nav.signup': 'साइन अप',
    'nav.searchPlaceholder': 'नस्ल, शीर्षक या वंशावली से खोजें...',
    'hero.badge': 'एडमिन-सत्यापित वंशावली',
    'hero.title': 'चैंपियन कबूतरों के लिए भारत का विश्वसनीय बाज़ार',
    'hero.subtitle':
      'भारत भर के सत्यापित लॉफ्ट से रेसिंग, फैंसी और हाई-फ्लायर कबूतर खरीदें और बेचें — विश्वसनीय विक्रेताओं से सीधा लेन-देन और एडमिन-जांची वंशावली के साथ।',
    'hero.cta.browse': 'कबूतर देखें',
    'hero.cta.sell': 'बेचना शुरू करें',
    'home.categories': 'श्रेणी के अनुसार खरीदें',
    'home.trending': 'ट्रेंडिंग पक्षी',
    'home.lofts': 'चुनिंदा लॉफ्ट',
    'home.loftsSub': 'Pigeono पर प्रीमियम सत्यापित ब्रीडर',
    'home.how': 'Pigeono कैसे काम करता है',
    'home.stat.escrow': 'विक्रेता को सीधा भुगतान',
    'home.stat.verified': 'एडमिन-सत्यापित वंशावली',
    'home.stat.lofts': 'भारत भर के विश्वसनीय लॉफ्ट',
    'home.stat.transport': 'जीवित पक्षी परिवहन',
    'home.cta.title': 'अपना अगला चैंपियन खोजने के लिए तैयार हैं?',
    'home.cta.sub': 'भारत भर में सत्यापित पक्षी खरीदने-बेचने वाले हज़ारों शौकीनों से जुड़ें।',
    'footer.tagline': 'भारत में सत्यापित वंशावली कबूतरों का विश्वसनीय बाज़ार।',
    'footer.buy': 'खरीदें',
    'footer.sell': 'बेचें',
    'footer.company': 'कंपनी',
    'footer.about': 'हमारे बारे में',
    'footer.blog': 'ब्लॉग',
    'footer.contact': 'संपर्क करें',
    'common.viewAll': 'सभी देखें',
  },
  bn: {
    'nav.home': 'হোম',
    'nav.browse': 'ব্রাউজ করুন',
    'nav.messages': 'বার্তা',
    'nav.orders': 'অর্ডার',
    'nav.wishlist': 'উইশলিস্ট',
    'nav.cart': 'কার্ট',
    'nav.notifications': 'বিজ্ঞপ্তি',
    'nav.profile': 'প্রোফাইল',
    'nav.admin': 'অ্যাডমিন',
    'nav.sales': 'বিক্রয়',
    'nav.myStore': 'আমার দোকান',
    'nav.becomeVendor': 'বিক্রেতা হন',
    'nav.logout': 'লগ আউট',
    'nav.login': 'লগ ইন',
    'nav.signup': 'সাইন আপ',
    'nav.searchPlaceholder': 'জাত, শিরোনাম বা বংশধারা দিয়ে খুঁজুন...',
    'hero.badge': 'অ্যাডমিন-যাচাইকৃত বংশতালিকা',
    'hero.title': 'চ্যাম্পিয়ন কবুতরের জন্য ভারতের বিশ্বস্ত মার্কেটপ্লেস',
    'hero.subtitle':
      'ভারত জুড়ে যাচাইকৃত লফট থেকে রেসিং, ফ্যান্সি ও হাই-ফ্লায়ার কবুতর কিনুন ও বিক্রি করুন — বিশ্বস্ত বিক্রেতাদের সাথে সরাসরি লেনদেন এবং অ্যাডমিন-যাচাইকৃত বংশতালিকা সহ।',
    'hero.cta.browse': 'কবুতর দেখুন',
    'hero.cta.sell': 'বিক্রি শুরু করুন',
    'home.categories': 'বিভাগ অনুযায়ী কিনুন',
    'home.trending': 'ট্রেন্ডিং পাখি',
    'home.lofts': 'বাছাই করা লফট',
    'home.loftsSub': 'Pigeono-তে প্রিমিয়াম যাচাইকৃত ব্রিডার',
    'home.how': 'Pigeono কীভাবে কাজ করে',
    'home.stat.escrow': 'বিক্রেতাকে সরাসরি পেমেন্ট',
    'home.stat.verified': 'অ্যাডমিন-যাচাইকৃত বংশতালিকা',
    'home.stat.lofts': 'ভারত জুড়ে বিশ্বস্ত লফট',
    'home.stat.transport': 'জীবন্ত পাখি পরিবহন',
    'home.cta.title': 'আপনার পরবর্তী চ্যাম্পিয়ন খুঁজতে প্রস্তুত?',
    'home.cta.sub': 'ভারত জুড়ে যাচাইকৃত পাখি কেনা-বেচা করা হাজারো শৌখিনদের সাথে যুক্ত হন।',
    'footer.tagline': 'ভারতে যাচাইকৃত বংশতালিকার কবুতরের বিশ্বস্ত মার্কেটপ্লেস।',
    'footer.buy': 'কিনুন',
    'footer.sell': 'বিক্রি করুন',
    'footer.company': 'কোম্পানি',
    'footer.about': 'আমাদের সম্পর্কে',
    'footer.blog': 'ব্লগ',
    'footer.contact': 'যোগাযোগ',
    'common.viewAll': 'সব দেখুন',
  },
}

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
]

const LangContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pigeono-lang') : null
    return DICTIONARIES[saved] ? saved : 'en'
  })

  const setLang = (code) => {
    if (!DICTIONARIES[code]) return
    setLangState(code)
    window.localStorage.setItem('pigeono-lang', code)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = (key) => DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

/** Safe fallback so a Vite HMR module mismatch never crashes the app */
const FALLBACK = {
  lang: 'en',
  setLang: () => {},
  t: (key) => DICTIONARIES.en[key] ?? key,
}

export function useLang() {
  return useContext(LangContext) ?? FALLBACK
}
