import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'sharp'],
}

export default withSentryConfig(nextConfig, {
  // Sentry organizasyon + proje (Sentry dashboard'dan al)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map'leri Sentry'ye yükle (production build'de)
  silent: true,

  // Performans izleme — route bazlı otomatik enstrümantasyon
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
