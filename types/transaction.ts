export interface TransactionConfig {
  targetAddress: string
  sendToSelf: boolean
  tokenType: "native" | "erc20"
  tokenAddress: string
  // 金额设置模式
  amountMode: "fixed" | "random" | "reserve"
  // 固定金额
  amount: string
  // 随机金额范围
  randomMinAmount: string
  randomMaxAmount: string
  // 保留数量
  reserveAmount: string
  hexData: string
  gasLimit: string
  gasPrice: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  useAutoGas: boolean
}
