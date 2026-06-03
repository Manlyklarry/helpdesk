import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const model = openai('gpt-5-nano')

const VALID_CATEGORIES = ['general', 'technical', 'refund'] as const
type Category = (typeof VALID_CATEGORIES)[number]

export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

export async function polishReply(
  body: string,
  customerFirstName: string,
  agentName: string,
): Promise<string> {
  const { text } = await generateText({
    model,
    system: [
      'You are a professional customer support agent at LarryDevLabs (larrydevlabs.com).',
      'Improve the following reply to be clear, concise, and professional while preserving the original intent.',
      `Address the customer by their first name: ${customerFirstName}.`,
      `Sign off with the agent name "${agentName}" and include larrydevlabs.com in the signature.`,
      'Return only the improved reply text — no extra commentary.',
    ].join(' '),
    prompt: body,
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
