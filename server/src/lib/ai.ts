import { generateText, generateObject } from 'ai'
import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { COMPANY_NAME, COMPANY_DOMAIN } from './constants.js'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const model = openai('gpt-4o-mini')

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

const autoResolveSchema = z.object({
  canResolve: z.boolean(),
  reply: z.string().optional(),
})

export async function autoResolveTicket(
  subject: string,
  body: string,
  knowledgeBase: string,
  customerFirstName: string,
): Promise<{ canResolve: false } | { canResolve: true; reply: string }> {
  const { object } = await generateObject({
    model,
    schema: autoResolveSchema,
    system: [
      `You are an AI support agent for ${COMPANY_NAME}${COMPANY_DOMAIN ? ` (${COMPANY_DOMAIN})` : ''}.`,
      'Given a customer support ticket and the official knowledge base, decide if you can fully resolve it.',
      'Set canResolve to true if the knowledge base contains enough information to directly answer the customer\'s question.',
      'Set canResolve to false only if: the topic is completely absent from the knowledge base, the issue requires manual account investigation, or escalation rules explicitly apply (legal threats, chargebacks, unverifiable refund eligibility).',
      'If canResolve is true, write a warm, professional reply addressing the customer by their first name.',
      `Sign off as "${COMPANY_NAME} Support Team"${COMPANY_DOMAIN ? ` (${COMPANY_DOMAIN})` : ''}.`,
    ].join(' '),
    prompt: `Knowledge Base:\n${knowledgeBase}\n\nTicket Subject: ${subject}\n\nCustomer (${customerFirstName}) wrote:\n${body.slice(0, 3_000)}`,
  })
  if (object.canResolve && object.reply && object.reply.length > 0) {
    return { canResolve: true, reply: object.reply }
  }
  return { canResolve: false }
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
