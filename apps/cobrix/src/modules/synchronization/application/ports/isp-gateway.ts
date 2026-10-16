export interface IspGateway {
  listContractIds(): Promise<number[]>
  getContractRows(contractId: number): Promise<unknown[]>
  getPaymentRows(
    contractId: number,
    startDate: string,
    endDate: string
  ): Promise<unknown[]>
}

export interface IspGatewayFactory {
  create(credentials: {
    readonly baseUrl: string
    readonly username: string
    readonly password: string
  }): IspGateway
}
