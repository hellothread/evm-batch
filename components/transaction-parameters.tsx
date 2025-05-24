"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { TransactionConfig } from "@/types/transaction"

interface TransactionParametersProps {
  config: TransactionConfig
  onConfigChange: (config: TransactionConfig) => void
}

export function TransactionParameters({ config, onConfigChange }: TransactionParametersProps) {
  const [activeGasTab, setActiveGasTab] = useState<string>(config.useAutoGas ? "auto" : "manual")

  // 处理字段变化
  const handleChange = (field: keyof TransactionConfig, value: string | boolean | number) => {
    onConfigChange({
      ...config,
      [field]: value,
    })
  }

  // 处理Gas设置选项卡变化
  useEffect(() => {
    handleChange("useAutoGas", activeGasTab === "auto")
  }, [activeGasTab])

  return (
    <div className="space-y-6">
      {/* 目标地址 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="targetAddress">目标地址/合约地址</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="sendToSelf"
              checked={config.sendToSelf}
              onCheckedChange={(checked) => handleChange("sendToSelf", checked)}
            />
            <Label htmlFor="sendToSelf" className="text-sm">
              发送到自身地址
            </Label>
          </div>
        </div>

        <Input
          id="targetAddress"
          placeholder="0x..."
          value={config.targetAddress}
          onChange={(e) => handleChange("targetAddress", e.target.value)}
          disabled={config.sendToSelf}
        />
      </div>

      {/* 代币类型 */}
      <div className="space-y-4">
        <Label>代币类型</Label>
        <RadioGroup
          value={config.tokenType}
          onValueChange={(value) => handleChange("tokenType", value)}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="native" id="native" />
            <Label htmlFor="native">原生代币</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="erc20" id="erc20" />
            <Label htmlFor="erc20">ERC-20 代币</Label>
          </div>
        </RadioGroup>
      </div>

      {/* ERC-20 代币地址 */}
      {config.tokenType === "erc20" && (
        <div className="space-y-2">
          <Label htmlFor="tokenAddress">ERC-20 代币合约地址</Label>
          <Input
            id="tokenAddress"
            placeholder="0x..."
            value={config.tokenAddress}
            onChange={(e) => handleChange("tokenAddress", e.target.value)}
          />
        </div>
      )}

      {/* 发送数量设置 */}
      <div className="space-y-4">
        <Label>发送数量设置</Label>
        <Tabs value={config.amountMode} onValueChange={(value) => handleChange("amountMode", value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fixed">固定数量</TabsTrigger>
            <TabsTrigger value="random">随机数量</TabsTrigger>
            <TabsTrigger value="reserve">保留数量</TabsTrigger>
          </TabsList>

          <TabsContent value="fixed" className="space-y-2">
            <Label htmlFor="amount">固定发送数量</Label>
            <Input
              id="amount"
              placeholder={`例如: 0.1 ${config.tokenType === "native" ? "" : "代币"}（不填默认为0）`}
              value={config.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              输入固定的发送数量。如果不填写或填写0，则发送0个代币（可用于合约交互）。
            </p>
          </TabsContent>

          <TabsContent value="random" className="space-y-4">
            <div className="space-y-2">
              <Label>随机数量范围（基于账户余额百分比）</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="randomMinAmount" className="text-sm">
                    最小百分比 (%)
                  </Label>
                  <Input
                    id="randomMinAmount"
                    placeholder="例如: 10"
                    value={config.randomMinAmount}
                    onChange={(e) => handleChange("randomMinAmount", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="randomMaxAmount" className="text-sm">
                    最大百分比 (%)
                  </Label>
                  <Input
                    id="randomMaxAmount"
                    placeholder="例如: 50"
                    value={config.randomMaxAmount}
                    onChange={(e) => handleChange("randomMaxAmount", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                系统将随机选择账户余额的百分比进行发送。例如：10-50% 表示发送余额的10%到50%之间的随机数量。
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reserve" className="space-y-2">
            <Label htmlFor="reserveAmount">保留数量</Label>
            <Input
              id="reserveAmount"
              placeholder={`例如: 0.1 ${config.tokenType === "native" ? "" : "代币"}（填写0表示全部发送）`}
              value={config.reserveAmount}
              onChange={(e) => handleChange("reserveAmount", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              设置要保留在账户中的数量，剩余的全部发送。如果填写0，则发送全部余额（扣除gas费用）。
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* 十六进制数据 */}
      <div className="space-y-2">
        <Label htmlFor="hexData">十六进制数据 (可选)</Label>
        <Textarea
          id="hexData"
          placeholder="0x..."
          value={config.hexData}
          onChange={(e) => {
            const value = e.target.value
            // 验证十六进制格式
            if (value && !/^(0x)?[0-9a-fA-F]*$/.test(value)) {
              // 如果输入的不是有效的十六进制，可以在这里添加提示
              // 但仍然允许用户输入，因为他们可能正在编辑
            }
            handleChange("hexData", value)
          }}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500">
          用于与智能合约交互的自定义calldata，必须是有效的十六进制格式（例如：0x1249c58b）
          <br />
          <span className="text-amber-600">注意：如果您不确定此字段的用途，请留空</span>
        </p>
      </div>

      {/* Gas 设置 */}
      <div className="space-y-2">
        <Label>Gas 设置</Label>
        <Tabs value={activeGasTab} onValueChange={setActiveGasTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">自动估算</TabsTrigger>
            <TabsTrigger value="manual">手动设置</TabsTrigger>
          </TabsList>

          <TabsContent value="auto">
            <p className="text-sm text-gray-500 mt-2">系统将自动估算每笔交易所需的Gas</p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2 mt-4">
              <Label htmlFor="gasLimit">Gas Limit</Label>
              <Input
                id="gasLimit"
                placeholder="例如: 180000"
                value={config.gasLimit}
                onChange={(e) => handleChange("gasLimit", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                建议设置为<span className="font-medium">180000</span>或根据您的交易复杂度适当调整
              </p>
            </div>

            <div className="space-y-4">
              <Label>Gas 价格设置</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gasPrice">Gas Price (Gwei)</Label>
                  <Input
                    id="gasPrice"
                    placeholder="例如: 20"
                    value={config.gasPrice}
                    onChange={(e) => handleChange("gasPrice", e.target.value)}
                  />
                  <p className="text-xs text-gray-500">传统Gas价格设置，建议使用当前网络平均值的1.1-1.2倍</p>
                </div>

                <div className="space-y-2">
                  <Label>EIP-1559 Gas设置 (Gwei)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Max Fee"
                      value={config.maxFeePerGas}
                      onChange={(e) => handleChange("maxFeePerGas", e.target.value)}
                    />
                    <Input
                      placeholder="Priority Fee"
                      value={config.maxPriorityFeePerGas}
                      onChange={(e) => handleChange("maxPriorityFeePerGas", e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">优先使用EIP-1559设置（如果同时填写）</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
