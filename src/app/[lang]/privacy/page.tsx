import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — SuomiSocial',
  description: 'SuomiSocial privacy policy and data protection information.',
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const lastUpdated = '7 May 2026'

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href={`/${lang}`} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">SS</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">SuomiSocial</span>
          </Link>
          <span className="text-xs text-muted-foreground">Privacy Policy</span>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight gradient-text mb-3">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-sm text-zinc-300 leading-relaxed">

          <Section title="1. Introduction">
            <p>
              SuomiSocial (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides an AI-powered social media
              automation platform for businesses operating in Finland. This Privacy Policy explains
              how we collect, use, store, and protect your information when you use our service at{' '}
              <span className="text-primary font-mono">suomisocial.fi</span>.
            </p>
            <p>
              By using SuomiSocial, you agree to the collection and use of information in
              accordance with this policy.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-3">
              <li><strong className="text-zinc-200">Account information:</strong> Email address and password (hashed by Supabase Auth)</li>
              <li><strong className="text-zinc-200">Business information:</strong> Company name, logo, brand tone, and product descriptions you provide</li>
              <li><strong className="text-zinc-200">Social media tokens:</strong> OAuth access tokens for Instagram and Facebook (see Section 4)</li>
              <li><strong className="text-zinc-200">Content data:</strong> AI-generated captions, images, and hashtags associated with your account</li>
              <li><strong className="text-zinc-200">Usage data:</strong> Pages visited, features used, and general analytics</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information solely to provide and improve the SuomiSocial service:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-3">
              <li>Authenticate and manage your account</li>
              <li>Generate AI content tailored to your brand and Finnish special days</li>
              <li>Publish approved content to your connected social media accounts</li>
              <li>Monitor and display ad campaign performance data</li>
              <li>Improve our AI models and service quality</li>
            </ul>
            <p className="mt-3">
              <strong className="text-zinc-200">We do not sell your data</strong> to third parties,
              use it for advertising, or share it with any party other than those listed in Section 5.
            </p>
          </Section>

          <Section title="4. Social Media Credentials & Vault Encryption">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 mb-4">
              <p className="text-emerald-300 font-semibold mb-1">🔐 Zero-Knowledge Token Storage</p>
              <p className="text-emerald-400/80 text-xs leading-relaxed">
                Your social media access tokens are <strong>never stored in plaintext</strong> in our
                database. All tokens are encrypted using <strong>AES-256-GCM (pgsodium)</strong> via
                Supabase Vault before storage. The master encryption key is managed by Supabase
                infrastructure — not accessible to SuomiSocial team members or any third party.
              </p>
            </div>
            <p>
              When you connect your Instagram or Facebook account, we receive an OAuth access token
              from Meta. This token is immediately encrypted and stored in our vault. Even with full
              database access, the raw token values cannot be read without the Supabase-managed
              encryption key.
            </p>
            <p className="mt-3">
              When you disconnect an account, both the database record <strong>and</strong> the
              encrypted vault entry are permanently deleted.
            </p>
          </Section>

          <Section title="5. Third-Party Services">
            <p>SuomiSocial uses the following third-party services:</p>
            <div className="space-y-3 mt-3">
              {[
                { name: 'Supabase', purpose: 'Database, authentication, and encrypted token storage', link: 'https://supabase.com/privacy' },
                { name: 'Anthropic (Claude)', purpose: 'AI-generated captions and content', link: 'https://www.anthropic.com/privacy' },
                { name: 'Pollinations.ai', purpose: 'AI image generation', link: 'https://pollinations.ai' },
                { name: 'Meta (Facebook/Instagram)', purpose: 'Social media posting via official Graph API', link: 'https://www.facebook.com/privacy/policy/' },
                { name: 'Vercel', purpose: 'Application hosting and deployment', link: 'https://vercel.com/legal/privacy-policy' },
              ].map((s) => (
                <div key={s.name} className="rounded-lg border border-white/8 bg-card px-4 py-3">
                  <p className="font-medium text-foreground text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.purpose}</p>
                  <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 block">
                    Privacy Policy →
                  </a>
                </div>
              ))}
            </div>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your data for as long as your account is active. Upon account deletion:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-3">
              <li>All personal information is permanently deleted within 30 days</li>
              <li>Social media tokens are immediately deleted from vault and database</li>
              <li>AI-generated content drafts are permanently deleted</li>
              <li>Anonymised usage statistics may be retained for service improvement</li>
            </ul>
          </Section>

          <Section title="7. Your Rights (GDPR)">
            <p>
              As a user based in the EU/EEA, you have the following rights under the General Data
              Protection Regulation (GDPR):
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-3">
              <li><strong className="text-zinc-200">Right of access:</strong> Request a copy of the data we hold about you</li>
              <li><strong className="text-zinc-200">Right to rectification:</strong> Correct inaccurate personal data</li>
              <li><strong className="text-zinc-200">Right to erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong className="text-zinc-200">Right to portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong className="text-zinc-200">Right to object:</strong> Object to processing of your personal data</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:volkankoral@gmail.com" className="text-primary hover:underline">
                volkankoral@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              SuomiSocial uses strictly necessary cookies for authentication (session management)
              only. We do not use tracking, advertising, or analytics cookies. No third-party
              cookies are set by our application.
            </p>
          </Section>

          <Section title="9. Security">
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-3">
              <li>AES-256-GCM encryption for all OAuth tokens (Supabase Vault)</li>
              <li>Row-Level Security (RLS) ensuring strict data isolation between organizations</li>
              <li>HTTPS enforcement on all connections</li>
              <li>Service role key separation — client-side code never has admin database access</li>
            </ul>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes via email or a prominent notice in the application. Continued use of SuomiSocial
              after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For privacy-related questions or requests, contact:
            </p>
            <div className="rounded-xl border border-white/8 bg-card px-4 py-4 mt-3">
              <p className="text-foreground font-medium">SuomiSocial</p>
              <p className="text-muted-foreground text-xs mt-1">Helsinki, Finland</p>
              <a href="mailto:volkankoral@gmail.com" className="text-primary text-sm hover:underline mt-1 block">
                volkankoral@gmail.com
              </a>
            </div>
          </Section>

        </div>
      </main>

      <footer className="border-t border-white/8 px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          SuomiSocial · Helsinki, Finland · 🇫🇮
        </p>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3 pb-2 border-b border-white/8">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
