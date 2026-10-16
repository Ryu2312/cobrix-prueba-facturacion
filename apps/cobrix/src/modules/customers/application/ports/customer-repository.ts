import type {
  CustomerDetails,
  CustomerSummary,
} from '../customer-read-models.ts'

export interface CustomerRepository {
  list(query: string): readonly CustomerSummary[]
  getById(id: string): CustomerDetails | null
}
