import { Link } from 'react-router-dom'
import { Bird } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Bird className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-3xl font-bold">Page flew away</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  )
}
