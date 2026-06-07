import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { COMPANY_NAME, COMPANY_DOMAIN } from './constants.js'

const model = openai('gpt-5-nano')

const VALID_CATEGORIES = ['general', 'technical', 'refund'] as const
type Category = (typeof VALID_CATEGORIES)[number]

export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

export async function polishReply(body: string, customerFirstName: string): Promise<string> {
  const { text } = await generateText({
    model,
    system: [
      `You are a professional customer support agent at ${COMPANY_NAME}${COMPANY_DOMAIN ? ` (${COMPANY_DOMAIN})` : ''}.`,
      'Rewrite the following reply to be clear, concise, professional, and customer-friendly.',
      'Use proper formatting: greet the customer by their first name at the start, use paragraphs or bullet points where appropriate, and end with a warm closing.',
      `Always sign off as "${COMPANY_NAME} Support Team"${COMPANY_DOMAIN ? ` and include ${COMPANY_DOMAIN} in the signature` : ''}.`,
      'Preserve the original intent. Return only the improved reply — no extra commentary.',
    ].join(' '),
    prompt: `Customer first name: ${customerFirstName}\n\nDraft reply:\n${body}`,
  })
  return text
}

export async function summarizeTicket(
  subject: string,
  messages: { senderType: string; fromName: string; body: string }[],
): Promise<string> {
  const thread = messages
    .map((m) => `[${m.senderType === 'agent' ? 'Agent' : 'Customer'} – ${m.fromName}]: ${m.body}`)
    .join('\n\n')
  const { text } = await generateText({
    model,
    system: [
      'You are a concise support ticket summarizer.',
      'Given a support ticket subject and its conversation history, produce a short, structured summary.',
      "Format your response as 2–4 bullet points covering: the customer's issue, any steps already taken or clarifications given, and the current resolution status.",
      'Use plain language. Do not include greetings, sign-offs, or extra commentary.',
      'Return only the bullet points.',
    ].join(' '),
    prompt: `Subject: ${subject}\n\nConversation:\n${thread}`,
  })
  return text
}

export async function autoResolveTicket(
  subject: string,
  body: string,
  knowledgeBase: string,
  customerFirstName: string,
): Promise<{ canResolve: false } | { canResolve: true; reply: string }> {
  const { text } = await generateText({
    model,
    system: [
      `You are an AI support agent for ${COMPANY_NAME}${COMPANY_DOMAIN ? ` (${COMPANY_DOMAIN})` : ''}.`,
      'Given a customer support ticket and the official support knowledge base, decide if you can fully resolve the ticket.',
      'You CANNOT resolve if any escalation rule from the knowledge base applies (legal threats, refund outside 30 days, chargebacks, account security concerns, or low confidence).',
      'You CANNOT resolve if the knowledge base does not cover the topic or the answer requires account-specific information.',
      'If you CAN resolve: write a professional, helpful reply addressing the customer by their first name, based only on the knowledge base.',
      `Sign off as "${COMPANY_NAME} Support Team"${COMPANY_DOMAIN ? ` and include ${COMPANY_DOMAIN} in the signature` : ''}.`,
      'Respond with valid JSON only — no markdown fences, no extra text.',
      'Format: {"canResolve":true,"reply":"..."} or {"canResolve":false}',
    ].join(' '),
    prompt: `Knowledge Base:\n${knowledgeBase}\n\nTicket Subject: ${subject}\n\nCustomer (${customerFirstName}) wrote:\n${body.slice(0, 3_000)}`,
  })
  try {
    const parsed = JSON.parse(text.trim()) as { canResolve: boolean; reply?: string }
    if (parsed.canResolve === true && typeof parsed.reply === 'string' && parsed.reply.length > 0) {
      return { canResolve: true, reply: parsed.reply }
    }
    return { canResolve: false }
  } catch {
    return { canResolve: false }
  }
}

export async function classifyTicket(subject: string, body: string): Promise<Category | null> {
  const { text } = await generateText({
    model,
    system: [
      'You are a support ticket classifier.',
      'Given a ticket subject and body, respond with exactly one word — the category that best fits.',
      'Valid categories: technical, refund, general.',
      '"technical" = something is broken or failing: software bugs, errors, crashes, API failures, integration issues, features not working as expected, or inability to access an account due to a system fault.',
      '"refund" = billing disputes, charge reversals, subscription cancellations, pricing errors, or requests for money back.',
      '"general" = how-to questions, feature requests, account setup guidance, general inquiries, and anything that is not a broken system or a billing issue.',
      'Respond with only the single category word. No punctuation, no explanation.',
    ].join(' '),
    prompt: `Subject: ${subject}\n\nBody: ${body.slice(0, 2_000)}`,
  })
  const category = text.trim().toLowerCase()
  return (VALID_CATEGORIES as readonly string[]).includes(category) ? (category as Category) : null
}
