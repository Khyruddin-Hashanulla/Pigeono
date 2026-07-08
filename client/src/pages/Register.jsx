import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Smartphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage } from '../lib/api'
import { PhoneOtpForm, GoogleSignInButton, EmailOtpVerify } from '../components/AuthMethods'

export default function Register() {
  const { register, verifyEmail, resendOtp, loginWithOtp, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [method, setMethod] = useState('email') // email | phone
  const [step, setStep] = useState('form') // form | verify
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const goHome = useCallback(() => navigate('/', { replace: true }), [navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await register(name, email, password)
      setDevOtp(data?.devOtp || '')
      setStep('verify')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="font-serif text-3xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">One last step to activate your Pigeono account.</p>
        <div className="mt-6">
          <EmailOtpVerify
            email={email}
            initialDevOtp={devOtp}
            verifyEmail={verifyEmail}
            resendOtp={resendOtp}
            onSuccess={goHome}
          />
        </div>
        <button
          type="button"
          onClick={() => setStep('form')}
          className="mt-6 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Used the wrong email? Go back
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-serif text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Join Pigeono to buy verified-pedigree birds or open your own loft store.
      </p>

      {/* Method tabs */}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1" role="tablist" aria-label="Sign up method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'email'}
          onClick={() => {
            setMethod('email')
            setError('')
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            method === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="size-4" aria-hidden="true" />
          Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'phone'}
          onClick={() => {
            setMethod('phone')
            setError('')
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            method === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone className="size-4" aria-hidden="true" />
          Phone
        </button>
      </div>

      {method === 'phone' ? (
        <div className="mt-6">
          <PhoneOtpForm loginWithOtp={loginWithOtp} onSuccess={goHome} />
        </div>
      ) : (
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      )}

      <div className="mt-6">
        <GoogleSignInButton loginWithGoogle={loginWithGoogle} onSuccess={goHome} onError={setError} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
