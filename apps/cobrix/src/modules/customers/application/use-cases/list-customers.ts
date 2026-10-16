import type { CustomerRepository } from '../ports/customer-repository.ts'

export class ListCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(query = '') {
    return this.customerRepository.list(query)
  }
}
