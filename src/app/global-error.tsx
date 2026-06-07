'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import NextError from 'next/error'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={500} />
        <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              background: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
