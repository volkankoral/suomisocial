import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Occaly',
  description: 'Occaly terms of service and usage conditions.',
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const lastUpdated = '7 June 2026'
  const companyName = 'Occaly'
  const companyEmail = 'privacy@occaly.com'

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href={`/${lang}`} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Oc</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">Occaly</span>
          </Link>
          <span className="text-xs text-muted-foreground">Terms of Service</span>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight gradient-text mb-3">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {companyName} (&quot;the Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree, you may not use the Service.
              These terms apply to all users, including free trial users and paying subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              {companyName} is an AI-powered social media content management platform that helps
              businesses create, schedule, and publish content across social media channels including
              Instagram, Facebook, TikTok, and Google Business Profile. The Service uses third-party
              AI providers (including Replicate and Pollinations) to generate images and text.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p className="mb-2">
              You must create an account to use the Service. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete registration information</li>
              <li>Promptly notifying us of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Subscription and Billing</h2>
            <p className="mb-2">
              {companyName} offers paid subscription plans. By subscribing:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>Subscriptions renew automatically unless canceled before the renewal date</li>
              <li>You may cancel your subscription at any time; access continues until the end of the paid period</li>
              <li>Refunds are not provided for partial billing periods, except where required by law</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
            <p className="mt-2">
              AI content generation is subject to monthly limits defined by your plan.
              Unused credits do not roll over.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generate or publish content that is illegal, harmful, defamatory, or violates third-party rights</li>
              <li>Spam, harass, or send unsolicited communications</li>
              <li>Reverse engineer, copy, or create derivative works of the Service</li>
              <li>Use automated tools to abuse or overload the Service</li>
              <li>Share your account credentials with others</li>
              <li>Violate the terms of service of connected platforms (Meta, TikTok, Google)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. AI-Generated Content</h2>
            <p className="mb-2">
              The Service uses artificial intelligence to generate images and text. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AI-generated content may occasionally contain errors, inaccuracies, or unexpected outputs</li>
              <li>You are responsible for reviewing all AI-generated content before publishing</li>
              <li>You retain ownership of content you publish through the Service</li>
              <li>{companyName} does not claim ownership over your generated content</li>
              <li>You grant {companyName} a limited license to process your content to provide the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Social Media Integrations</h2>
            <p>
              The Service connects to third-party platforms (Meta, TikTok, Google). These integrations
              are subject to the respective platforms&apos; terms. {companyName} is not responsible for
              changes to third-party APIs, content moderation decisions, or account restrictions
              imposed by those platforms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href={`/${lang}/privacy`} className="text-primary hover:underline">
                Privacy Policy
              </Link>
              {' '}and{' '}
              <Link href={`/${lang}/cookie`} className="text-primary hover:underline">
                Cookie Policy
              </Link>
              . We process personal data in accordance with the EU General Data Protection Regulation (GDPR)
              and applicable Finnish data protection law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Intellectual Property</h2>
            <p>
              The {companyName} platform, including its design, features, and underlying technology,
              is owned by {companyName} and protected by intellectual property laws.
              You may not use our trademarks, logos, or branding without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
              We do not guarantee that the Service will be uninterrupted, error-free, or that AI-generated
              content will meet your specific requirements or quality expectations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, {companyName} shall not be liable
              for indirect, incidental, special, or consequential damages arising from your use of
              the Service, including but not limited to lost profits, data loss, or business interruption.
              Our total liability shall not exceed the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms.
              You may close your account at any time. Upon termination, your data will be retained
              for 30 days and then permanently deleted, unless longer retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated
              by email or in-app notification at least 14 days before taking effect.
              Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by Finnish law. Any disputes shall be resolved in the
              District Court of Helsinki (Helsingin käräjäoikeus), Finland.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">15. Contact</h2>
            <p>
              For questions regarding these Terms, please contact us at{' '}
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
          <Link href={`/${lang}/cookie`} className="hover:text-foreground transition-colors">Cookie Policy</Link>
          <Link href={`/${lang}`} className="hover:text-foreground transition-colors">occaly.com</Link>
        </div>
      </footer>
    </div>
  )
}
