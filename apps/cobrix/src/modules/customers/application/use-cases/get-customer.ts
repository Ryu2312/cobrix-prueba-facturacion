import type { CustomerRepository } from '../ports/customer-repository.ts'

export class GetCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(id: string) {
    return this.customerRepository.getById(id)
  }
}
