export const customerSearchQuerySchema = {
  type: 'object',
  properties: { q: { type: 'string', maxLength: 120 } },
  additionalProperties: false,
} as const

export const customerIdParamsSchema = {
  type: 'object',
  properties: { id: { type: 'string', minLength: 1, maxLength: 20 } },
  required: ['id'],
  additionalProperties: false,
} as const
