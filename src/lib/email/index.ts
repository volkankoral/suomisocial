import { Resend } from 'resend'

// Lazy init — build sırasında RESEND_API_KEY olmayabilir, runtime'da olacak
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'Occaly <noreply@occaly.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://occaly.com'

// ─── Ortak HTML şablonu ──────────────────────────────────────────────────────
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Occaly</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;border:1px solid #27272a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ec4899);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Occaly</h1>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">AI Social Media & Ads Automation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;background:#0d0d0d;">
              <p style="margin:0;font-size:11px;color:#71717a;">
                © 2026 Occaly ·
                <a href="${APP_URL}/en/privacy" style="color:#71717a;">Privacy</a> ·
                <a href="${APP_URL}/en/terms" style="color:#71717a;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${text}</a>`
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fafafa;">${text}</h2>`
}

function p(text: string): string {
  return `<p style="margin:0 0 10px;font-size:14px;color:#a1a1aa;line-height:1.6;">${text}</p>`
}

// ─── Email türleri ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string
  businessName: string
  lang?: string
}) {
  const lang = opts.lang ?? 'en'
  const dashUrl = `${APP_URL}/${lang}/dashboard`

  const body = `
    ${h2('Welcome to Occaly! 🎉')}
    ${p(`Hi ${opts.businessName || 'there'},`)}
    ${p('Your account is ready. You can now generate AI-powered social media content, schedule posts to Instagram, Facebook, and more — all from one dashboard.')}
    ${p('<strong style="color:#fafafa;">Here\'s what to do next:</strong>')}
    <ul style="margin:10px 0 14px;padding-left:20px;color:#a1a1aa;font-size:14px;line-height:1.8;">
      <li>Complete your brand profile</li>
      <li>Connect your social media accounts</li>
      <li>Generate your first AI content</li>
    </ul>
    ${btn('Go to Dashboard →', dashUrl)}
  `

  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: '🎉 Welcome to Occaly — let\'s get started',
    html: layout(body),
  })
}

export async function sendPaymentSuccessEmail(opts: {
  to: string
  businessName: string
  planName: string
  amount: string
  nextBillingDate: string
  lang?: string
}) {
  const lang = opts.lang ?? 'en'
  const billingUrl = `${APP_URL}/${lang}/billing`

  const body = `
    ${h2('Payment successful ✅')}
    ${p(`Hi ${opts.businessName || 'there'},`)}
    ${p(`Your <strong style="color:#fafafa;">${opts.planName}</strong> subscription is now active. Thank you for your payment of <strong style="color:#fafafa;">${opts.amount}</strong>.`)}
    <table style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 14px;background:#18181b;border-radius:8px 8px 0 0;border-bottom:1px solid #27272a;font-size:13px;color:#71717a;">Plan</td>
        <td style="padding:10px 14px;background:#18181b;border-radius:8px 8px 0 0;border-bottom:1px solid #27272a;font-size:13px;color:#fafafa;text-align:right;">${opts.planName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#18181b;border-bottom:1px solid #27272a;font-size:13px;color:#71717a;">Amount paid</td>
        <td style="padding:10px 14px;background:#18181b;border-bottom:1px solid #27272a;font-size:13px;color:#fafafa;text-align:right;">${opts.amount}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#18181b;border-radius:0 0 8px 8px;font-size:13px;color:#71717a;">Next billing</td>
        <td style="padding:10px 14px;background:#18181b;border-radius:0 0 8px 8px;font-size:13px;color:#fafafa;text-align:right;">${opts.nextBillingDate}</td>
      </tr>
    </table>
    ${btn('View Billing →', billingUrl)}
  `

  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `✅ Payment confirmed — ${opts.planName} plan`,
    html: layout(body),
  })
}

export async function sendSubscriptionCanceledEmail(opts: {
  to: string
  businessName: string
  planName: string
  accessUntil: string
  lang?: string
}) {
  const lang = opts.lang ?? 'en'
  const billingUrl = `${APP_URL}/${lang}/billing`

  const body = `
    ${h2('Subscription canceled')}
    ${p(`Hi ${opts.businessName || 'there'},`)}
    ${p(`Your <strong style="color:#fafafa;">${opts.planName}</strong> subscription has been canceled. You'll continue to have full access until <strong style="color:#fafafa;">${opts.accessUntil}</strong>.`)}
    ${p('After that date, your account will revert to free access. You can resubscribe at any time.')}
    <div style="margin:20px 0;padding:16px;background:#18181b;border-radius:10px;border:1px solid #27272a;">
      <p style="margin:0;font-size:13px;color:#a1a1aa;">Changed your mind? Resubscribe before ${opts.accessUntil} and keep all your content and settings.</p>
    </div>
    ${btn('Manage Subscription →', billingUrl)}
  `

  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Subscription canceled — access until ${opts.accessUntil}`,
    html: layout(body),
  })
}

export async function sendPaymentFailedEmail(opts: {
  to: string
  businessName: string
  planName: string
  lang?: string
}) {
  const lang = opts.lang ?? 'en'
  const billingUrl = `${APP_URL}/${lang}/billing`

  const body = `
    ${h2('Payment failed ⚠️')}
    ${p(`Hi ${opts.businessName || 'there'},`)}
    ${p(`We were unable to process the payment for your <strong style="color:#fafafa;">${opts.planName}</strong> subscription. Please update your payment method to avoid losing access.`)}
    <div style="margin:20px 0;padding:16px;background:#271515;border-radius:10px;border:1px solid #7f1d1d;">
      <p style="margin:0;font-size:13px;color:#fca5a5;">⚠️ If payment is not resolved within 7 days, your subscription will be suspended.</p>
    </div>
    ${btn('Update Payment Method →', billingUrl)}
  `

  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: '⚠️ Payment failed — action required',
    html: layout(body),
  })
}

// ─── Autopilot: Taslaklar Hazır ─────────────────────────────────────────────
export async function sendAutopilotReadyEmail(opts: {
  to:           string
  businessName: string
  draftCount:   number
  lang?:        string
}) {
  const lang     = opts.lang ?? 'en'
  const reviewUrl = `${APP_URL}/${lang}/autopilot`

  const subjects: Record<string, string> = {
    tr: `🤖 ${opts.draftCount} yeni içerik taslağın hazır — onayla!`,
    fi: `🤖 ${opts.draftCount} uutta luonnosta odottaa hyväksyntää`,
    en: `🤖 ${opts.draftCount} new content drafts ready for review`,
  }
  const subject = subjects[lang] ?? subjects.en

  const bodies: Record<string, string> = {
    tr: `
      ${h2(`🤖 ${opts.draftCount} taslak hazırlandı`)}
      ${p(`Merhaba ${opts.businessName || 'işletmeniz'},`)}
      ${p(`Autopilot bu hafta <strong style="color:#fafafa;">${opts.draftCount} adet sosyal medya içeriği</strong> üretti. Taslakları inceleyip onaylayabilir veya düzenleyebilirsiniz.`)}
      ${p('Bir taslağı onayladığınızda Instagram ve Facebook\'ta paylaşıma hazır hale gelir.')}
      ${btn('Taslakları İncele →', reviewUrl)}
    `,
    fi: `
      ${h2(`🤖 ${opts.draftCount} luonnosta valmiina`)}
      ${p(`Hei ${opts.businessName || ''},`)}
      ${p(`Autopilot on luonut <strong style="color:#fafafa;">${opts.draftCount} uutta some-sisältöä</strong>. Tarkista ja hyväksy luonnokset ennen julkaisua.`)}
      ${btn('Tarkista luonnokset →', reviewUrl)}
    `,
    en: `
      ${h2(`🤖 ${opts.draftCount} drafts ready`)}
      ${p(`Hi ${opts.businessName || 'there'},`)}
      ${p(`Autopilot created <strong style="color:#fafafa;">${opts.draftCount} social media content drafts</strong> for you. Review and approve them before publishing.`)}
      ${btn('Review Drafts →', reviewUrl)}
    `,
  }

  const body = bodies[lang] ?? bodies.en

  await getResend().emails.send({
    from:    FROM,
    to:      opts.to,
    subject,
    html:    layout(body),
  })
}

// ── Olumsuz yorum bildirimi ───────────────────────────────────────────────────

export async function sendNegativeReviewAlert(opts: {
  to:          string
  platform:    string       // 'Google Business' | 'Facebook' | 'Instagram'
  authorName:  string
  rating:      number | null
  comment:     string
  reviewUrl:   string       // Occaly dashboard'daki yorum linki
}) {
  const stars  = opts.rating ? '⭐'.repeat(opts.rating) : ''
  const preview = opts.comment.length > 200 ? opts.comment.slice(0, 200) + '…' : opts.comment

  await getResend().emails.send({
    from:    FROM,
    to:      opts.to,
    subject: `⚠️ Olumsuz yorum: ${opts.platform} — ${opts.authorName}`,
    html: layout(`
      ${h2('⚠️ Yeni olumsuz yorum')}
      ${p(`<strong style="color:#fafafa;">${opts.authorName}</strong> ${opts.platform} üzerinde bir yorum bıraktı.`)}
      ${stars ? p(`Puan: ${stars} (${opts.rating}/5)`) : ''}
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #f97316;background:#1a1a1a;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#d4d4d8;line-height:1.6;font-style:italic;">"${preview}"</p>
      </blockquote>
      ${p('Occaly\'de AI taslak cevabı hazır — inceleyip düzenleyebilirsiniz.')}
      ${btn('Yoruma Cevap Ver →', opts.reviewUrl)}
    `),
  })
}
