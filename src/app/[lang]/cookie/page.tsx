import Link from 'next/link'

export const metadata = {
  title: 'Cookie Policy — Occaly',
  description: 'Occaly cookie policy and tracking technologies.',
}

export default async function CookiePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const lastUpdated = '7 June 2026'
  const companyEmail = 'privacy@occaly.com'

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href={`/${lang}`} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Oc</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">Occaly</span>
          </Link>
          <span className="text-xs text-muted-foreground">Cookie Policy</span>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight gradient-text mb-3">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They help us provide a better user experience by remembering your preferences and
              keeping you logged in. This policy explains what cookies we use and how you can
              control them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Cookies We Use</h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <h3 className="font-semibold text-foreground mb-1">Strictly Necessary Cookies</h3>
                <p className="text-xs text-muted-foreground mb-2">Always active — cannot be disabled</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/8">
                      <th className="text-left pb-2 font-medium">Name</th>
                      <th className="text-left pb-2 font-medium">Purpose</th>
                      <th className="text-left pb-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    <tr className="border-b border-white/5">
                      <td className="py-2 font-mono text-foreground">sb-*</td>
                      <td className="py-2">Authentication session (Supabase)</td>
                      <td className="py-2">Session / 1 year</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 font-mono text-foreground">NEXT_LOCALE</td>
                      <td className="py-2">Language preference</td>
                      <td className="py-2">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <h3 className="font-semibold text-foreground mb-1">Functional Cookies</h3>
                <p className="text-xs text-muted-foreground mb-2">Enable enhanced features</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/8">
                      <th className="text-left pb-2 font-medium">Name</th>
                      <th className="text-left pb-2 font-medium">Purpose</th>
                      <th className="text-left pb-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 font-mono text-foreground">occaly-prefs</td>
                      <td className="py-2">UI preferences (theme, panel state)</td>
                      <td className="py-2">6 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <h3 className="font-semibold text-foreground mb-1">Third-Party Cookies</h3>
                <p className="text-xs text-muted-foreground mb-2">Set by external services we use</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/8">
                      <th className="text-left pb-2 font-medium">Provider</th>
                      <th className="text-left pb-2 font-medium">Purpose</th>
                      <th className="text-left pb-2 font-medium">More info</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    <tr className="border-b border-white/5">
                      <td className="py-2 text-foreground">Stripe</td>
                      <td className="py-2">Secure payment processing</td>
                      <td className="py-2">
                        <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-primary hover:underline">
                          stripe.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">Vercel</td>
                      <td className="py-2">Hosting and performance</td>
                      <td className="py-2">
                        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" className="text-primary hover:underline">
                          vercel.com
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Your Choices</h2>
            <p className="mb-3">
              You can control cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>View cookies stored on your device</li>
              <li>Delete cookies individually or all at once</li>
              <li>Block cookies from specific sites</li>
              <li>Block all third-party cookies</li>
            </ul>
            <p className="mt-3 text-amber-300/80 bg-amber-500/10 rounded-lg px-4 py-3 border border-amber-500/20">
              ⚠️ Disabling strictly necessary cookies (authentication cookies) will prevent you
              from logging in to Occaly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Browser Cookie Settings</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { browser: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                { browser: 'Firefox', url: 'https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer' },
                { browser: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471' },
                { browser: 'Edge', url: 'https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09' },
              ].map(b => (
                <a
                  key={b.browser}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 hover:border-white/20 transition-colors flex items-center gap-2"
                >
                  <span className="text-primary">→</span>
                  <span>{b.browser} cookie settings</span>
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. GDPR Rights</h2>
            <p className="mb-2">
              Under GDPR and Finnish data protection law, you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Access</strong> — request a copy of your personal data</li>
              <li><strong className="text-foreground">Rectification</strong> — correct inaccurate data</li>
              <li><strong className="text-foreground">Erasure</strong> — request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong className="text-foreground">Portability</strong> — receive your data in a machine-readable format</li>
              <li><strong className="text-foreground">Objection</strong> — object to certain types of processing</li>
              <li><strong className="text-foreground">Withdraw consent</strong> — at any time, where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">
                {companyEmail}
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with the
              Finnish Data Protection Ombudsman (
              <a href="https://tietosuoja.fi" target="_blank" rel="noopener" className="text-primary hover:underline">
                tietosuoja.fi
              </a>
              ).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy periodically. Changes will be posted on this page
              with an updated date. For significant changes, we will notify you by email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Contact</h2>
            <p>
              Questions about our use of cookies or your data rights?{' '}
              <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">
                {companyEmail}
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8 px-6 mt-8">
        <div className="mx-auto max-w-3xl flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href={`/${lang}/privacy`} className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href={`/${lang}/terms`} className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href={`/${lang}`} className="hover:text-foreground transition-colors">occaly.com</Link>
        </div>
      </footer>
    </div>
  )
}
