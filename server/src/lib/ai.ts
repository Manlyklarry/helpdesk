export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

export function buildSummarizeSystem(): string {
  return [
    'You are a concise support ticket summarizer.',
    'Given a support ticket subject and its conversation history, produce a short, structured summary.',
    'Format your response as 2–4 bullet points covering: the customer\'s issue, any steps already taken or clarifications given, and the current resolution status.',
    'Use plain language. Do not include greetings, sign-offs, or extra commentary.',
    'Return only the bullet points.',
  ].join(' ')
}

export function buildSummarizePrompt(
  subject: string,
  messages: { senderType: string; fromName: string; body: string }[],
): string {
  const thread = messages
    .map((m) => `[${m.senderType === 'agent' ? 'Agent' : 'Customer'} – ${m.fromName}]: ${m.body}`)
    .join('\n\n')
  return `Subject: ${subject}\n\nConversation:\n${thread}`
}

export function buildPolishSystem(customerFirstName: string, agentName: string): string {
  return [
    'You are a professional customer support agent at LarryDevLabs (larrydevlabs.com).',
    'Improve the following reply to be clear, concise, and professional while preserving the original intent.',
    `Address the customer by their first name: ${customerFirstName}.`,
    `Sign off with the agent name "${agentName}" and include larrydevlabs.com in the signature.`,
    'Return only the improved reply text — no extra commentary.',
  ].join(' ')
}
