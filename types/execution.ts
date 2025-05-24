export interface ExecutionConfig {
  // 执行模式
  mode: "sequential" | "parallel" // 串行或并行

  // 间隔时间设置（毫秒）
  minInterval: number
  maxInterval: number
  enableInterval: boolean

  // 循环设置
  loopCount: number
  enableLoop: boolean

  // 随机化设置
  randomizeAmount: boolean
  minAmount: string
  maxAmount: string

  randomizeAddress: boolean
  addressList: string[]

  // 并行设置
  maxConcurrent: number // 最大并行数量

  // Gas估算设置
  continueOnGasEstimationFailure: boolean // Gas估算失败时是否继续执行
  defaultGasLimit: string // Gas估算失败时使用的默认值
}
