export const invoiceSearchQuerySchema = {
  type: 'object',
  properties: { status: { type: 'string', enum: ['OPEN', 'PAID'] } },
  additionalProperties: false,
} as const
