import { Link } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import Seo from '../components/Seo'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Blog() {
  const posts = useFetch('/content/posts')
  const items = posts.data?.data || []

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Seo
        title="Blog — Pigeon Keeping, Racing & Breeding Guides"
        description="Guides on pigeon keeping, racing, breeding and buying safely in India, from the Pigeono team."
      />
      <h1 className="font-serif text-3xl font-bold">Pigeono Blog</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Guides on pigeon keeping, racing, breeding and buying safely in India.
      </p>

      {posts.loading ? (
        <LoadingState label="Loading articles..." />
      ) : posts.error ? (
        <ErrorState message={posts.error} onRetry={posts.refetch} />
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No articles yet" message="Check back soon for guides and news." />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
            >
              <img
                src={post.coverImage || '/placeholder.svg'}
                alt=""
                aria-hidden="true"
                className="h-44 w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="p-4">
                <time dateTime={post.publishedAt} className="text-xs text-muted-foreground">
                  {formatDate(post.publishedAt)}
                </time>
                <h2 className="mt-1 font-serif text-lg font-bold leading-snug text-balance group-hover:text-primary">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
