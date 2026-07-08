import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState } from '../components/States'
import Seo from '../components/Seo'

export default function BlogPost() {
  const { slug } = useParams()
  const post = useFetch(`/content/posts/${slug}`, [slug])
  const data = post.data?.data

  if (post.loading) return <LoadingState label="Loading article..." />
  if (post.error) return <ErrorState message={post.error} onRetry={post.refetch} />
  if (!data) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Seo
        title={data.title}
        description={data.body.slice(0, 155)}
        image={data.coverImage}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          image: data.coverImage ? [data.coverImage] : undefined,
          datePublished: data.publishedAt,
          publisher: { '@type': 'Organization', name: 'Pigeono' },
        }}
      />
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All articles
      </Link>
      <article className="mt-6">
        <time dateTime={data.publishedAt} className="text-xs text-muted-foreground">
          {new Date(data.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </time>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-balance md:text-4xl">{data.title}</h1>
        {data.coverImage && (
          <img src={data.coverImage || '/placeholder.svg'} alt="" aria-hidden="true" className="mt-6 w-full rounded-lg object-cover" />
        )}
        <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed">
          {data.body.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </main>
  )
}
