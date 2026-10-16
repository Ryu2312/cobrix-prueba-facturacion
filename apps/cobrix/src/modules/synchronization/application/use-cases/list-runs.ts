import type { RunHistoryRepository } from '../ports/run-history-repository.ts'

export class ListRunsUseCase {
  constructor(private readonly runHistoryRepository: RunHistoryRepository) {}

  execute() {
    return this.runHistoryRepository.list()
  }
}
