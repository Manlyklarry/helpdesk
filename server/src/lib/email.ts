import sgMail from '@sendgrid/mail'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? ''
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? ''

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

export interface SendReplyOptions {
  to: string
  subject: string
  text: string
  fromName: string
  messageId: string
  inReplyTo?: string
}

export async function sendReply(opts: SendReplyOptions): Promise<void> {
  if (!SENDGRID_API_KEY || !SUPPORT_EMAIL) {
    console.warn('[email] SendGrid not configured — skipping send')
    return
  }

  const subject = opts.subject.startsWith('Re:') ? opts.subject : `Re: ${opts.subject}`

  await sgMail.send({
    to: opts.to,
    from: { email: SUPPORT_EMAIL, name: opts.fromName },
    subject,
    text: opts.text,
    headers: {
      'Message-ID': `<${opts.messageId}>`,
      ...(opts.inReplyTo ? { 'In-Reply-To': `<${opts.inReplyTo}>` } : {}),
    },
  })
}
