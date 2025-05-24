export interface TransactionResult {
  id: number
  sender: string
  recipient: string
  amount: string
  status: "等待处理" | "处理中" | "成功" | "失败" | "等待重试"
  txHash: string
  timestamp: string
  network: string
  tokenType: "native" | "erc20"
  tokenSymbol: string
  errorMessage?: string
}
