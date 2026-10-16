export const settingsUpdateSchema = {
  type: 'object',
  properties: {
    company: {
      type: 'object',
      required: ['name', 'taxId', 'collectionEmail'],
      properties: {
        name: { type: 'string', maxLength: 160 },
        taxId: { type: 'string', maxLength: 32 },
        collectionEmail: { type: 'string', maxLength: 254 },
      },
      additionalProperties: false,
    },
    provider: {
      type: 'object',
      required: ['baseUrl', 'username'],
      properties: {
        baseUrl: { type: 'string', minLength: 1, maxLength: 500 },
        username: { type: 'string', minLength: 1, maxLength: 100 },
        password: { type: 'string', maxLength: 500 },
      },
      additionalProperties: false,
    },
    sync: {
      type: 'object',
      required: [
        'statuses',
        'importWindowMonths',
        'maxInstallmentsPerContract',
        'graceDays',
        'maxNewInvoices',
        'maxNewAmount',
        'excludedDocumentTypes',
        'scheduleEnabled',
        'scheduleTime',
      ],
      properties: {
        statuses: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'ACTIVO',
              'CORTADO',
              'CORTESIA',
              'RETIRADO',
              'RECHAZADO',
              'ANULADO',
            ],
          },
          uniqueItems: true,
        },
        importWindowMonths: {
          anyOf: [{ type: 'integer', enum: [3, 6, 9, 12] }, { type: 'null' }],
        },
        maxInstallmentsPerContract: {
          anyOf: [
            { type: 'integer', minimum: 1, maximum: 60 },
            { type: 'null' },
          ],
        },
        graceDays: { type: 'integer', minimum: 0, maximum: 60 },
        maxNewInvoices: {
          anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
        },
        maxNewAmount: {
          anyOf: [
            { type: 'number', exclusiveMinimum: 0, multipleOf: 0.01 },
            { type: 'null' },
          ],
        },
        excludedDocumentTypes: {
          type: 'array',
          items: { type: 'string', enum: ['V', 'E', 'J', 'G', 'P'] },
          uniqueItems: true,
        },
        scheduleEnabled: { type: 'boolean' },
        scheduleTime: {
          type: 'string',
          pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
        },
      },
      additionalProperties: false,
    },
  },
  required: ['company', 'provider', 'sync'],
  additionalProperties: false,
} as const
