import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  // Performans izleme — her 10 işlemden 1'ini örnekle (production trafiği arttıkça azalt)
  tracesSampleRate: 0.1,

  // Session replay — hata olduğunda %100, normal kullanımda %10
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
})
