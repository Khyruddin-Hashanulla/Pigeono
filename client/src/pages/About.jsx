import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Truck, IndianRupee, Users, Bird } from 'lucide-react'

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Every vendor is verified',
    body: 'Our admin team manually reviews every loft before it can sell — no anonymous sellers, no fake pedigrees.',
  },
  {
    icon: Lock,
    title: 'Direct seller payments',
    body: 'You pay the seller directly via UPI, bank transfer or cash — no middleman holding your money, no hidden platform cut.',
  },
  {
    icon: Truck,
    title: 'Pickup or delivery, your choice',
    body: 'Collect your bird from the loft or agree delivery terms directly with the seller. Every step is tracked in your order timeline.',
  },
  {
    icon: IndianRupee,
    title: 'Built for India',
    body: 'INR pricing, Indian transport networks, and support in English, Hindi and Bengali.',
  },
]

export default function About() {
  return (
    <main>
      <section className="bg-foreground text-background">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bird className="size-7" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-3xl font-bold text-balance md:text-4xl">
            India&apos;s trusted marketplace for champion pigeons
          </h1>
          <p className="max-w-2xl text-base leading-relaxed opacity-90">
            Pigeono connects serious fanciers with verified lofts across India. From racing homers in Chennai to
            high-flyers in Delhi, every bird on our platform comes from an admin-approved breeder.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14" aria-labelledby="values-heading">
        <h2 id="values-heading" className="text-center font-serif text-2xl font-bold">
          Why fanciers choose Pigeono
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="flex gap-4 rounded-lg border border-border bg-card p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <v.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-12 text-center">
          <Users className="size-8 text-primary" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-bold">Are you a breeder?</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Open your own loft store, reach buyers across India, and grow with plans starting at ₹599/month.
          </p>
          <Link
            to="/become-vendor"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Become a vendor
          </Link>
        </div>
      </section>
    </main>
  )
}
