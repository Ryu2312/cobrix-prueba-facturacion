import type { RunHistoryRepository } from '../ports/run-history-repository.ts'

export class GetRunUseCase {
  constructor(private readonly runHistoryRepository: RunHistoryRepository) {}

  execute(id: number) {
    return this.runHistoryRepository.getById(id)
  }
}
