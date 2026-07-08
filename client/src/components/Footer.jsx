import { Link } from 'react-router-dom'
import { Bird } from 'lucide-react'
import { useLang } from '../lib/i18n'

export default function Footer() {
  const { t } = useLang()
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bird className="size-4" aria-hidden="true" />
            </span>
            <span className="font-serif text-lg font-bold">Pigeono</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('footer.tagline')}</p>
        </div>
        <nav aria-label="Marketplace">
          <h3 className="text-sm font-semibold">Marketplace</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/search?category=racing" className="hover:text-foreground">Racing pigeons</Link></li>
            <li><Link to="/search?category=high-flying" className="hover:text-foreground">High flyers</Link></li>
            <li><Link to="/search?category=show" className="hover:text-foreground">Show breeds</Link></li>
            <li><Link to="/search?verifiedOnly=true" className="hover:text-foreground">Verified pedigrees</Link></li>
          </ul>
        </nav>
        <nav aria-label="Sell">
          <h3 className="text-sm font-semibold">Sell</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/become-vendor" className="hover:text-foreground">Become a vendor</Link></li>
            <li><Link to="/dashboard/vendor" className="hover:text-foreground">Vendor dashboard</Link></li>
            <li><Link to="/dashboard/vendor/subscription" className="hover:text-foreground">Subscription plans</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <h3 className="text-sm font-semibold">{t('footer.company')}</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">{t('footer.about')}</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">{t('footer.blog')}</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">{t('footer.contact')}</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="text-sm font-semibold">Trust &amp; Safety</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every pedigree badge on Pigeono is verified by our admin team. You deal directly with the seller, and our
            team steps in if anything goes wrong.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Pigeono. All rights reserved.
      </div>
    </footer>
  )
}
