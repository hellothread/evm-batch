"use client"

import { useState, useRef } from "react"
import { ethers } from "ethers"
import { NetworkSelector } from "@/components/network-selector"
import { TransactionParameters } from "@/components/transaction-parameters"
import { PrivateKeyInput } from "@/components/private-key-input"
import { ExecutionPanel } from "@/components/execution-panel"
import { LogOutput } from "@/components/log-output"
import { TransactionStats } from "@/components/transaction-stats"
import { TransactionResultsTable } from "@/components/transaction-results-table"
import type { NetworkConfig } from "@/types/network"
import type { TransactionConfig } from "@/types/transaction"
import type { LogEntry } from "@/types/log"
import type { ExecutionConfig } from "@/types/execution"
import type { TransactionResult } from "@/types/transaction-result"

export default function Web3BatchTool() {
  // 网络配置状态
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig>({
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    chainId: 1,
    currencySymbol: "ETH",
    blockExplorerUrl: "https://etherscan.io",
  })

  // 交易参数状态
  const [transactionConfig, setTransactionConfig] = useState<TransactionConfig>({
    targetAddress: "",
    sendToSelf: false,
    tokenType: "native",
    tokenAddress: "",
    amountMode: "fixed",
    amount: "",
    randomMinAmount: "",
    randomMaxAmount: "",
    reserveAmount: "",
    hexData: "",
    gasLimit: "",
    gasPrice: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    useAutoGas: true,
  })

  // 私钥状态
  const [privateKeys, setPrivateKeys] = useState<string[]>([])

  // 日志状态
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)

  // 交易结果状态
  const [transactionResults, setTransactionResults] = useState<TransactionResult[]>([])
  const nextResultId = useRef(1)

  // 停止标志
  const stopExecutionRef = useRef(false)

  // 执行配置状态
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    mode: "sequential",
    minInterval: 3000,
    maxInterval: 6000,
    enableInterval: false,
    loopCount: 1,
    enableLoop: false,
    randomizeAmount: false,
    minAmount: "",
    maxAmount: "",
    randomizeAddress: false,
    addressList: [],
    maxConcurrent: 5,
  })

  // 交易统计状态
  const [txStats, setTxStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
  })

  // 使用useRef来跟踪最新的统计数据，避免闭包问题
  const txStatsRef = useRef(txStats)
  txStatsRef.current = txStats

  // 计算实际发送金额
  const calculateSendAmount = async (
    balance: bigint,
    decimals = 18,
    provider: ethers.JsonRpcProvider,
    wallet: ethers.Wallet,
  ): Promise<{ amount: string; amountBigInt: bigint }> => {
    let amountBigInt: bigint
    let amount: string

    switch (transactionConfig.amountMode) {
      case "fixed":
        // 固定数量模式
        amount = transactionConfig.amount.trim()
        if (!amount) {
          amount = "0"
        }
        try {
          if (transactionConfig.tokenType === "native") {
            amountBigInt = ethers.parseEther(amount)
          } else {
            amountBigInt = ethers.parseUnits(amount, decimals)
          }
        } catch (error) {
          throw new Error(`固定金额格式无效: ${amount}`)
        }
        break

      case "random":
        // 随机数量模式（基于余额百分比）
        const minPercent = Number.parseFloat(transactionConfig.randomMinAmount) || 0
        const maxPercent = Number.parseFloat(transactionConfig.randomMaxAmount) || 0

        if (minPercent < 0 || maxPercent < 0 || minPercent > 100 || maxPercent > 100) {
          throw new Error("百分比必须在0-100之间")
        }
        if (minPercent > maxPercent) {
          throw new Error("最小百分比不能大于最大百分比")
        }

        const randomPercent = minPercent + Math.random() * (maxPercent - minPercent)
        amountBigInt = (balance * BigInt(Math.floor(randomPercent * 100))) / BigInt(10000) // 使用basis points避免浮点精度问题

        if (transactionConfig.tokenType === "native") {
          amount = ethers.formatEther(amountBigInt)
        } else {
          amount = ethers.formatUnits(amountBigInt, decimals)
        }
        break

      case "reserve":
        // 保留数量模式
        const reserveAmount = transactionConfig.reserveAmount.trim()
        let reserveBigInt: bigint

        try {
          if (!reserveAmount) {
            reserveBigInt = BigInt(0)
          } else {
            if (transactionConfig.tokenType === "native") {
              reserveBigInt = ethers.parseEther(reserveAmount)
            } else {
              reserveBigInt = ethers.parseUnits(reserveAmount, decimals)
            }
          }
        } catch (error) {
          throw new Error(`保留金额格式无效: ${reserveAmount}`)
        }

        if (reserveBigInt > balance) {
          throw new Error("保留金额不能大于当前余额")
        }

        // 对于原生代币，需要预留gas费用
        if (transactionConfig.tokenType === "native") {
          // 估算gas费用
          let gasCost = BigInt(0)
          try {
            // 简单估算: gasLimit * gasPrice
            const gasLimit = BigInt(transactionConfig.gasLimit || "21000")
            const feeData = await provider.getFeeData()
            let gasPrice = feeData.gasPrice || BigInt(0)

            if (transactionConfig.gasPrice) {
              gasPrice = ethers.parseUnits(transactionConfig.gasPrice, "gwei")
            }

            gasCost = gasLimit * gasPrice
          } catch (error) {
            // 如果估算失败，使用默认值
            gasCost = ethers.parseEther("0.0001") // 预留0.001 ETH作为gas费用
          }

          amountBigInt = balance - reserveBigInt - gasCost
          if (amountBigInt < 0) {
            throw new Error("余额不足以支付保留金额和gas费用")
          }
        } else {
          // ERC20代币不需要预留gas（gas用原生代币支付）
          amountBigInt = balance - reserveBigInt
        }

        if (transactionConfig.tokenType === "native") {
          amount = ethers.formatEther(amountBigInt)
        } else {
          amount = ethers.formatUnits(amountBigInt, decimals)
        }
        break

      default:
        throw new Error("未知的金额模式")
    }

    return { amount, amountBigInt }
  }

  // 添加交易结果记录
  const addTransactionResult = (result: Omit<TransactionResult, "id">) => {
    const newResult: TransactionResult = {
      ...result,
      id: nextResultId.current++,
    }
    setTransactionResults((prev) => [...prev, newResult])
  }

  // 更新交易结果
  const updateTransactionResult = (id: number, updates: Partial<TransactionResult>) => {
    setTransactionResults((prev) => prev.map((result) => (result.id === id ? { ...result, ...updates } : result)))
  }

  // 清空交易结果
  const clearTransactionResults = () => {
    setTransactionResults([])
    nextResultId.current = 1
  }

  // 导出CSV
  const exportTransactionResultsCSV = () => {
    if (transactionResults.length === 0) {
      alert("没有数据可导出")
      return
    }

    const headers = ["ID", "发送方", "接收方", "金额", "代币", "状态", "交易哈希", "网络", "时间", "错误信息"]
    const csvContent = [
      headers.join(","),
      ...transactionResults.map((result) =>
        [
          result.id,
          result.sender,
          result.recipient,
          result.amount,
          result.tokenSymbol,
          result.status,
          result.txHash,
          result.network,
          result.timestamp,
          result.errorMessage || "",
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `交易结果_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 添加日志的函数
  const addLog = (level: "info" | "success" | "warning" | "error", message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    }
    setLogs((prevLogs) => [...prevLogs, newLog])
  }

  // 清除日志的函数
  const clearLogs = () => {
    setLogs([])
    // 同时重置统计数据
    setTxStats({
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
    })
  }

  // 更新交易统计的函数 - 使用函数式更新确保基于最新状态
  const updateTxStats = (updater: (currentStats: typeof txStats) => typeof txStats) => {
    setTxStats(updater)
  }

  // 获取随机间隔时间
  const getRandomInterval = () => {
    const min = executionConfig.minInterval
    const max = executionConfig.maxInterval
    return Math.floor(min + Math.random() * (max - min + 1))
  }

  // 停止执行的函数
  const stopExecution = () => {
    stopExecutionRef.current = true
    addLog("warning", "正在停止执行...当前交易完成后将停止")
  }

  // 获取链上Gas参数
  const getGasParameters = async (provider: ethers.JsonRpcProvider) => {
    try {
      // 获取链上的fee data
      const feeData = await provider.getFeeData()
      
      // 获取链上的gas limit
      const block = await provider.getBlock('latest')
      const baseGasLimit = block?.gasLimit || BigInt(30000000) // 默认值
      
      return {
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasPrice: feeData.gasPrice,
        baseGasLimit
      }
    } catch (error) {
      throw new Error(`获取链上Gas参数失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Gas估算函数
  const estimateGasWithFallback = async (
    provider: ethers.JsonRpcProvider,
    txParams: any,
    shortAddress: string,
    addLog: (level: "info" | "success" | "warning" | "error", message: string) => void
  ): Promise<bigint> => {
    try {
      // 首先尝试使用estimateGas
      const gasEstimate = await provider.estimateGas(txParams)
      return gasEstimate
    } catch (estimateError) {
      // 如果estimateGas失败，根据交易类型使用不同的默认值
      const errorMessage = estimateError instanceof Error ? estimateError.message : String(estimateError)
      addLog("warning", `地址 ${shortAddress}: Gas估算失败 - ${errorMessage}，将使用预设值`)

      // 根据交易类型设置不同的默认Gas限制
      if (txParams.data && txParams.data !== "0x") {
        // 合约调用
        return BigInt(300000) // 合约调用默认值
      } else {
        // 普通转账
        return BigInt(21000) // 普通转账默认值
      }
    }
  }

  // 执行批量交易的函数
  const executeTransactions = async () => {
    if (privateKeys.length === 0) {
      addLog("error", "请输入至少一个私钥")
      return
    }

    setIsExecuting(true)
    // 重置停止标志
    stopExecutionRef.current = false

    addLog("info", `开始在 ${selectedNetwork.name} 上执行批量交易`)

    try {
      // 创建provider
      const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl)

      // 检查网络连接
      try {
        const network = await provider.getNetwork()
        addLog("info", `成功连接到网络: ${network.name} (Chain ID: ${network.chainId})`)
      } catch (error) {
        addLog(
          "error",
          `无法连接到网络 ${selectedNetwork.name}: ${error instanceof Error ? error.message : String(error)}`,
        )
        setIsExecuting(false)
        return
      }

      // 准备交易任务
      const tasks: (() => Promise<void>)[] = []

      // 计算总任务数
      const loopCount = executionConfig.enableLoop ? executionConfig.loopCount : 1
      const totalTasks = privateKeys.length * loopCount

      // 初始化统计数据
      setTxStats({
        total: totalTasks,
        success: 0,
        failed: 0,
        pending: totalTasks,
      })

      // 对每个私钥创建交易任务
      for (const [keyIndex, privateKey] of privateKeys.entries()) {
        // 确定循环次数
        for (let loop = 0; loop < loopCount; loop++) {
          tasks.push(async () => {
            // 检查是否应该停止执行
            if (stopExecutionRef.current) {
              updateTxStats((current) => ({
                ...current,
                pending: current.pending - 1,
              }))
              return
            }

            let resultId: number | null = null

            try {
              // 创建钱包
              const wallet = new ethers.Wallet(privateKey, provider)
              const walletAddress = await wallet.getAddress()

              // 使用地址的简短形式用于日志显示
              const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`

              const loopInfo = executionConfig.enableLoop ? ` (循环 ${loop + 1}/${loopCount})` : ""
              addLog("info", `处理地址: ${shortAddress}${loopInfo}`)

              // 确定目标地址
              let targetAddress = transactionConfig.targetAddress
              if (transactionConfig.sendToSelf || !targetAddress.trim()) {
                targetAddress = walletAddress
                if (!transactionConfig.sendToSelf && !transactionConfig.targetAddress.trim()) {
                  addLog("info", `目标地址为空，默认发送到自身地址: ${shortAddress}`)
                }
              } else if (executionConfig.randomizeAddress && executionConfig.addressList.length > 0) {
                // 随机选择一个地址
                const randomIndex = Math.floor(Math.random() * executionConfig.addressList.length)
                targetAddress = executionConfig.addressList[randomIndex]
                addLog("info", `随机选择目标地址: ${targetAddress}`)
              }

              // 添加交易结果记录（初始状态）
              const newResult = {
                sender: walletAddress,
                recipient: targetAddress,
                amount: "计算中...",
                status: "等待处理" as const,
                txHash: "待处理",
                timestamp: new Date().toLocaleString(),
                network: selectedNetwork.name,
                tokenType: transactionConfig.tokenType,
                tokenSymbol: transactionConfig.tokenType === "native" ? selectedNetwork.currencySymbol : "TOKEN",
              }
              addTransactionResult(newResult)
              resultId = nextResultId.current - 1 // 获取刚添加的结果ID

              // 检查余额并计算发送金额
              let balance: bigint
              let decimals = 18
              let calculatedAmount: string
              let amountBigInt: bigint

              if (transactionConfig.tokenType === "native") {
                // 检查原生代币余额
                balance = await provider.getBalance(walletAddress)
                addLog(
                  "info",
                  `地址 ${shortAddress} 余额: ${ethers.formatEther(balance)} ${selectedNetwork.currencySymbol}`,
                )

                // 计算发送金额
                const result = await calculateSendAmount(balance, 18, provider, wallet)
                calculatedAmount = result.amount
                amountBigInt = result.amountBigInt
              } else {
                // ERC20代币
                if (!transactionConfig.tokenAddress) {
                  const errorMsg = "未指定ERC20代币地址"
                  addLog("error", `地址 ${shortAddress}: ${errorMsg}`)
                  if (resultId) {
                    updateTransactionResult(resultId, {
                      status: "失败",
                      errorMessage: errorMsg,
                    })
                  }
                  updateTxStats((current) => ({
                    ...current,
                    failed: current.failed + 1,
                    pending: current.pending - 1,
                  }))
                  return
                }

                try {
                  // 创建ERC20合约接口
                  const erc20Interface = new ethers.Interface([
                    "function balanceOf(address) view returns (uint256)",
                    "function decimals() view returns (uint8)",
                  ])

                  const tokenContract = new ethers.Contract(transactionConfig.tokenAddress, erc20Interface, provider)

                  // 获取代币精度
                  try {
                    decimals = await tokenContract.decimals()
                  } catch (error) {
                    addLog(
                      "warning",
                      `地址 ${shortAddress}: 无法获取代币精度，使用默认值18 - ${error instanceof Error ? error.message : String(error)}`,
                    )
                  }

                  // 获取代币余额
                  balance = await tokenContract.balanceOf(walletAddress)
                  addLog("info", `地址 ${shortAddress} 代币余额: ${ethers.formatUnits(balance, decimals)} TOKEN`)

                  // 计算发送金额
                  const result = await calculateSendAmount(balance, decimals, provider, wallet)
                  calculatedAmount = result.amount
                  amountBigInt = result.amountBigInt
                } catch (error) {
                  const errorMsg = `获取ERC20代币信息失败 - ${error instanceof Error ? error.message : String(error)}`
                  addLog("error", `地址 ${shortAddress}: ${errorMsg}`)
                  if (resultId) {
                    updateTransactionResult(resultId, {
                      status: "失败",
                      errorMessage: errorMsg,
                    })
                  }
                  updateTxStats((current) => ({
                    ...current,
                    failed: current.failed + 1,
                    pending: current.pending - 1,
                  }))
                  return
                }
              }

              // 更新交易结果中的金额
              if (resultId) {
                updateTransactionResult(resultId, {
                  amount: calculatedAmount,
                  status: "处理中",
                })
              }

              // 记录计算出的金额
              addLog(
                "info",
                `地址 ${shortAddress}: 计算发送金额: ${calculatedAmount} ${selectedNetwork.currencySymbol || "TOKEN"}`,
              )

              // 准备交易参数
              let txParams: any = {
                to: targetAddress,
              }

              // 处理不同的代币类型
              if (transactionConfig.tokenType === "native") {
                // 发送原生代币
                txParams.value = amountBigInt
              } else if (transactionConfig.tokenType === "erc20") {
                try {
                  // 创建ERC20合约接口
                  const erc20Interface = new ethers.Interface([
                    "function transfer(address to, uint256 amount) returns (bool)",
                  ])

                  // 编码transfer函数调用
                  const data = erc20Interface.encodeFunctionData("transfer", [targetAddress, amountBigInt])

                  txParams = {
                    to: transactionConfig.tokenAddress,
                    data,
                    value: 0,
                  }
                } catch (error) {
                  const errorMsg = `准备ERC20交易失败 - ${error instanceof Error ? error.message : String(error)}`
                  addLog("error", `地址 ${shortAddress}: ${errorMsg}`)
                  if (resultId) {
                    updateTransactionResult(resultId, {
                      status: "失败",
                      errorMessage: errorMsg,
                    })
                  }
                  updateTxStats((current) => ({
                    ...current,
                    failed: current.failed + 1,
                    pending: current.pending - 1,
                  }))
                  return
                }
              }

              // 添加自定义hex数据
              if (transactionConfig.hexData && transactionConfig.tokenType === "native") {
                try {
                  // 确保hexData格式正确
                  const cleanHexData = transactionConfig.hexData.trim()
                  txParams.data = cleanHexData.startsWith("0x") ? cleanHexData : `0x${cleanHexData}`

                  // 检查data是否为有效的十六进制字符串
                  if (!/^0x[0-9a-fA-F]*$/.test(txParams.data)) {
                    throw new Error("无效的十六进制数据格式")
                  }
                } catch (error) {
                  const errorMsg = `无效的十六进制数据 - ${error instanceof Error ? error.message : String(error)}`
                  addLog("error", `地址 ${shortAddress}: ${errorMsg}`)
                  if (resultId) {
                    updateTransactionResult(resultId, {
                      status: "失败",
                      errorMessage: errorMsg,
                    })
                  }
                  updateTxStats((current) => ({
                    ...current,
                    failed: current.failed + 1,
                    pending: current.pending - 1,
                  }))
                  return
                }
              }

              // 处理Gas设置
              if (transactionConfig.useAutoGas) {
                try {
                  // 获取链上Gas参数
                  const gasParams = await getGasParameters(provider)
                  
                  // 记录估算前的交易参数
                  addLog(
                    "info",
                    `地址 ${shortAddress}: 准备交易参数: ${JSON.stringify({
                      to: txParams.to,
                      value: txParams.value ? ethers.formatEther(txParams.value) + " ETH" : "0 ETH",
                      data: txParams.data || "无数据",
                    })}`,
                  )

                  // 估算Gas
                  const gasEstimate = await estimateGasWithFallback(provider, txParams, shortAddress, addLog)
                  txParams.gasLimit = gasEstimate
                  
                  // 设置Gas价格
                  if (gasParams.maxFeePerGas && gasParams.maxPriorityFeePerGas) {
                    // EIP-1559
                    txParams.maxFeePerGas = gasParams.maxFeePerGas
                    txParams.maxPriorityFeePerGas = gasParams.maxPriorityFeePerGas
                  } else {
                    // 传统Gas价格
                    txParams.gasPrice = gasParams.gasPrice
                  }

                  addLog("info", `地址 ${shortAddress}: 估算Gas: ${gasEstimate.toString()}`)
                  
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  addLog("error", `地址 ${shortAddress}: Gas估算失败 - ${errorMessage}`)

                  if (resultId) {
                    updateTransactionResult(resultId, {
                      status: "失败",
                      errorMessage: errorMessage,
                    })
                  }

                  updateTxStats((current) => ({
                    ...current,
                    failed: current.failed + 1,
                    pending: current.pending - 1,
                  }))
                  return
                }
              } else {
                // 使用手动设置的Gas，确保至少有一个基本的gasLimit
                if (transactionConfig.gasLimit) {
                  txParams.gasLimit = transactionConfig.gasLimit
                } else {
                  // 如果未设置gasLimit，提供一个默认值
                  txParams.gasLimit = "21000" // 设置一个合理的默认值
                  addLog("info", `地址 ${shortAddress}: 未设置Gas限制，使用默认值: 21000`)
                }

                // EIP-1559 Gas设置
                if (transactionConfig.maxFeePerGas && transactionConfig.maxPriorityFeePerGas) {
                  txParams.maxFeePerGas = ethers.parseUnits(transactionConfig.maxFeePerGas, "gwei")
                  txParams.maxPriorityFeePerGas = ethers.parseUnits(transactionConfig.maxPriorityFeePerGas, "gwei")
                }
                // 传统Gas设置
                else if (transactionConfig.gasPrice) {
                  txParams.gasPrice = ethers.parseUnits(transactionConfig.gasPrice, "gwei")
                } else {
                  // 如果未设置gas价格，获取当前网络gas价格
                  try {
                    const feeData = await provider.getFeeData()
                    if (feeData.gasPrice) {
                      txParams.gasPrice = feeData.gasPrice
                      addLog(
                        "info",
                        `地址 ${shortAddress}: 使用当前网络Gas价格: ${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei`,
                      )
                    }
                  } catch (error) {
                    addLog("warning", `地址 ${shortAddress}: 无法获取网络Gas价格，交易可能会失败`)
                  }
                }
              }

              // 发送交易
              addLog("info", `地址 ${shortAddress}: 发送交易...`)
              const tx = await wallet.sendTransaction(txParams)

              // 更新交易结果
              if (resultId) {
                updateTransactionResult(resultId, {
                  txHash: tx.hash,
                  status: "处理中",
                })
              }

              // 构建区块浏览器链接
              let explorerUrl = ""
              if (selectedNetwork.blockExplorerUrl) {
                explorerUrl = `${selectedNetwork.blockExplorerUrl}/tx/${tx.hash}`
              }

              // 直接将交易哈希作为链接
              if (explorerUrl) {
                addLog(
                  "success",
                  `地址 ${shortAddress}: 交易发送成功! 交易哈希: <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${tx.hash}</a>`,
                )
              } else {
                addLog("success", `地址 ${shortAddress}: 交易发送成功! 交易哈希: ${tx.hash}`)
              }

              // 检查是否应该停止执行
              if (stopExecutionRef.current) {
                updateTxStats((current) => ({
                  ...current,
                  pending: current.pending - 1,
                }))
                return
              }

              // 等待交易确认
              addLog("info", `地址 ${shortAddress}: 等待交易确认...`)
              const receipt = await tx.wait()

              if (receipt && receipt.status === 1) {
                addLog("success", `地址 ${shortAddress}: 交易已确认!`)
                // 更新统计数据 - 成功
                updateTxStats((current) => ({
                  ...current,
                  success: current.success + 1,
                  pending: current.pending - 1,
                }))
                // 更新交易结果
                if (resultId) {
                  updateTransactionResult(resultId, { status: "成功" })
                }
              } else {
                addLog("warning", `地址 ${shortAddress}: 交易可能失败，请在区块浏览器中检查`)
                // 更新统计数据 - 失败
                updateTxStats((current) => ({
                  ...current,
                  failed: current.failed + 1,
                  pending: current.pending - 1,
                }))
                // 更新交易结果
                if (resultId) {
                  updateTransactionResult(resultId, {
                    status: "失败",
                    errorMessage: "交易执行失败，请查看区块浏览器",
                  })
                }
              }
            } catch (error) {
              // 尝试从错误中提取地址信息
              let errorMessage = `交易处理失败: ${error instanceof Error ? error.message : String(error)}`

              // 如果是钱包相关错误，可能会有地址信息
              try {
                const wallet = new ethers.Wallet(privateKey)
                const address = await wallet.getAddress()
                const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
                errorMessage = `地址 ${shortAddress}: ${errorMessage}`
              } catch {
                // 如果无法获取地址，就使用索引
                errorMessage = `私钥 #${keyIndex + 1}: ${errorMessage}`
              }

              addLog("error", errorMessage)

              // 更新交易结果
              if (resultId) {
                updateTransactionResult(resultId, {
                  status: "失败",
                  errorMessage: error instanceof Error ? error.message : String(error),
                })
              }

              // 更新统计数据 - 失败
              updateTxStats((current) => ({
                ...current,
                failed: current.failed + 1,
                pending: current.pending - 1,
              }))
            }
          })
        }
      }

      // 执行任务
      if (executionConfig.mode === "sequential") {
        // 串行执行
        for (const [index, task] of tasks.entries()) {
          // 检查是否应该停止执行
          if (stopExecutionRef.current) {
            // 更新剩余任务的统计数据
            const remainingTasks = tasks.length - index
            updateTxStats((current) => ({
              ...current,
              pending: current.pending - remainingTasks,
            }))
            break
          }

          await task()

          // 如果不是最后一个任务且启用了间隔，则等待
          if (index < tasks.length - 1 && executionConfig.enableInterval && !stopExecutionRef.current) {
            const randomInterval = getRandomInterval()
            const seconds = (randomInterval / 1000).toFixed(1)
            addLog("info", `等待 ${seconds} 秒后执行下一个交易...`)

            // 使用可中断的等待
            const waitPromise = new Promise<void>((resolve) => {
              const intervalId = setInterval(() => {
                if (stopExecutionRef.current) {
                  clearInterval(intervalId)
                  resolve()
                }
              }, 100)

              setTimeout(() => {
                clearInterval(intervalId)
                resolve()
              }, randomInterval)
            })

            await waitPromise
          }
        }
      } else {
        // 并行执行
        addLog("info", `并行执行交易，最大并行数: ${executionConfig.maxConcurrent}`)

        // 使用 p-limit 限制并发数
        const executeTasks = async () => {
          const pendingTasks = [...tasks]
          const runningTasks = new Set()

          while ((pendingTasks.length > 0 || runningTasks.size > 0) && !stopExecutionRef.current) {
            // 填充运行中的任务，直到达到最大并行数
            while (
              pendingTasks.length > 0 &&
              runningTasks.size < executionConfig.maxConcurrent &&
              !stopExecutionRef.current
            ) {
              const task = pendingTasks.shift()!
              const taskPromise = task().finally(() => {
                runningTasks.delete(taskPromise)
              })
              runningTasks.add(taskPromise)
            }

            // 等待任意一个任务完成
            if (runningTasks.size > 0) {
              await Promise.race(runningTasks)
            }

            // 如果停止标志被设置，更新剩余任务的统计数据
            if (stopExecutionRef.current && pendingTasks.length > 0) {
              updateTxStats((current) => ({
                ...current,
                pending: current.pending - pendingTasks.length,
              }))
              break
            }
          }
        }

        await executeTasks()
      }

      if (stopExecutionRef.current) {
        addLog("warning", "执行已停止")
      } else {
        addLog("info", "批量交易执行完成")
      }
    } catch (error) {
      addLog("error", `执行过程中发生错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsExecuting(false)
      stopExecutionRef.current = false
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Web3批量操作工具</h1>

      <div className="grid grid-cols-1 gap-6">
        {/* 网络设置 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">网络设置</h2>
          <NetworkSelector selectedNetwork={selectedNetwork} onNetworkChange={setSelectedNetwork} />
        </div>

        {/* 交易参数设置 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">交易参数设置</h2>
          <TransactionParameters config={transactionConfig} onConfigChange={setTransactionConfig} />
        </div>

        {/* 私钥输入 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">私钥输入</h2>
          <PrivateKeyInput onPrivateKeysChange={setPrivateKeys} disabled={isExecuting} />
        </div>

        {/* 执行操作 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">执行操作</h2>
          <ExecutionPanel
            onExecute={executeTransactions}
            onStop={stopExecution}
            isExecuting={isExecuting}
            config={executionConfig}
            onConfigChange={setExecutionConfig}
          />
        </div>

        {/* 日志输出 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">日志输出</h2>

          {/* 交易统计 */}
          {(txStats.total > 0 || isExecuting) && (
            <TransactionStats
              total={txStats.total}
              success={txStats.success}
              failed={txStats.failed}
              pending={txStats.pending}
            />
          )}

          {/* 交易结果表格 */}
          {(transactionResults.length > 0 || isExecuting) && (
            <div className="mb-4">
              <TransactionResultsTable
                results={transactionResults}
                onClearResults={clearTransactionResults}
                onExportCSV={exportTransactionResultsCSV}
                blockExplorerUrl={selectedNetwork.blockExplorerUrl}
              />
            </div>
          )}

          <LogOutput logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>
    </div>
  )
}
