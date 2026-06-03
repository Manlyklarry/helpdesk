export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
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
