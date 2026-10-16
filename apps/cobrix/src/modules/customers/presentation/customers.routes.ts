import type { FastifyInstance } from 'fastify'

import type { GetCustomerUseCase } from '../application/use-cases/get-customer.ts'
import type { ListCustomersUseCase } from '../application/use-cases/list-customers.ts'
import {
  toCustomerDetailsResponseDto,
  toCustomerSummaryResponseDto,
} from './customers.dto.ts'
import {
  customerIdParamsSchema,
  customerSearchQuerySchema,
} from './customers.schema.ts'

export class CustomersRoutes {
  constructor(
    private readonly listCustomers: ListCustomersUseCase,
    private readonly getCustomer: GetCustomerUseCase
  ) {}

  register(app: FastifyInstance): void {
    app.get<{ Querystring: { readonly q?: string } }>(
      '/api/customers',
      { schema: { querystring: customerSearchQuerySchema } },
      async (request) =>
        this.listCustomers
          .execute(request.query.q ?? '')
          .map(toCustomerSummaryResponseDto)
    )

    app.get<{ Params: { readonly id: string } }>(
      '/api/customers/:id',
      { schema: { params: customerIdParamsSchema } },
      async (request, reply) => {
        const customer = this.getCustomer.execute(request.params.id)
        if (!customer)
          return reply
            .code(404)
            .send({ error: 'NOT_FOUND', message: 'No se encontró el cliente.' })
        return toCustomerDetailsResponseDto(customer)
      }
    )
  }
}
