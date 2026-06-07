import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  // Server-side işlemler için daha yüksek örnekleme
  tracesSampleRate: 0.2,
})
