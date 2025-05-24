"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Loader2, Settings2, Clock, Repeat, Shuffle, Layers, Info, ChevronRight, StopCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import type { ExecutionConfig } from "@/types/execution"

interface ExecutionPanelProps {
  onExecute: () => void
  onStop: () => void
  isExecuting: boolean
  config: ExecutionConfig
  onConfigChange: (config: ExecutionConfig) => void
}

export function ExecutionPanel({ onExecute, onStop, isExecuting, config, onConfigChange }: ExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("basic")
  const [intervalValues, setIntervalValues] = useState<number[]>([config.minInterval / 1000, config.maxInterval / 1000])

  // 处理字段变化
  const handleChange = (field: keyof ExecutionConfig, value: any) => {
    onConfigChange({
      ...config,
      [field]: value,
    })
  }

  // 处理间隔时间范围变化
  useEffect(() => {
    handleChange("minInterval", intervalValues[0] * 1000)
    handleChange("maxInterval", intervalValues[1] * 1000)
  }, [intervalValues])

  // 确保最小值不大于最大值，最大值不小于最小值
  const handleIntervalChange = (values: number[]) => {
    // 确保数组有两个值
    if (values.length !== 2) return

    // 如果最小值大于最大值，将最大值设置为最小值
    if (values[0] > values[1]) {
      setIntervalValues([values[0], values[0]])
    }
    // 如果最大值小于最小值，将最小值设置为最大值
    else if (values[1] < values[0]) {
      setIntervalValues([values[1], values[1]])
    }
    // 正常情况
    else {
      setIntervalValues(values)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="text-base">
            基本设置
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-base">
            高级设置
            {(config.enableInterval ||
              config.enableLoop ||
              config.randomizeAmount ||
              config.randomizeAddress ||
              config.mode === "parallel") && (
              <Badge variant="secondary" className="ml-2">
                已配置
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 pt-4">
          <p className="text-sm text-gray-500">点击下方按钮开始执行批量交易。执行前，系统将检查所有参数是否正确。</p>

          {isExecuting ? (
            <div className="flex gap-2">
              <Button onClick={onStop} className="w-full bg-red-600 hover:bg-red-700" size="lg">
                <StopCircle className="mr-2 h-4 w-4" />
                停止执行
              </Button>
            </div>
          ) : (
            <Button onClick={onExecute} disabled={isExecuting} className="w-full" size="lg">
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  执行中...
                </>
              ) : (
                "开始执行"
              )}
            </Button>
          )}

          <div className="text-xs text-gray-500">
            <p>执行前将进行以下检查：</p>
            <ul className="list-disc list-inside mt-1">
              <li>私钥格式是否正确</li>
              <li>目标地址是否为有效地址格式</li>
              <li>网络RPC是否可连接</li>
              <li>估算Gas是否充足</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 pt-4">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium">高级执行选项</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 执行模式卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-base">执行模式</CardTitle>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">选择交易的执行方式：串行（一个接一个）或并行（同时多个）</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <CardDescription>选择交易执行的方式</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={config.mode === "sequential" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleChange("mode", "sequential")}
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    串行执行
                  </Button>
                  <Button
                    variant={config.mode === "parallel" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleChange("mode", "parallel")}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    并行执行
                  </Button>
                </div>

                {config.mode === "parallel" && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="maxConcurrent">最大并行数量</Label>
                      <span className="text-sm font-medium">{config.maxConcurrent}</span>
                    </div>
                    <Slider
                      id="maxConcurrent"
                      min={2}
                      max={20}
                      step={1}
                      value={[config.maxConcurrent]}
                      onValueChange={(value) => handleChange("maxConcurrent", value[0])}
                      className="my-2"
                    />
                    <p className="text-xs text-gray-500">同时执行的最大交易数量</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 间隔时间卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-base">间隔时间</CardTitle>
                  </div>
                  <Switch
                    checked={config.enableInterval}
                    onCheckedChange={(checked) => handleChange("enableInterval", checked)}
                  />
                </div>
                <CardDescription>设置交易之间的等待时间</CardDescription>
              </CardHeader>
              <CardContent>
                {config.enableInterval ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="interval">交易间隔时间范围</Label>
                      <span className="text-sm font-medium">
                        {intervalValues[0]} - {intervalValues[1]} 秒
                      </span>
                    </div>
                    <Slider
                      id="interval"
                      min={0}
                      max={60}
                      step={1}
                      value={intervalValues}
                      onValueChange={handleIntervalChange}
                      className="my-2"
                    />
                    <p className="text-xs text-gray-500">
                      {config.mode === "sequential"
                        ? "每个交易之间将随机等待上述范围内的时间"
                        : "注意：间隔时间在并行模式下不生效"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-sm text-gray-500">
                    启用此选项以设置交易间隔时间
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 循环执行卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Repeat className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-base">循环执行</CardTitle>
                  </div>
                  <Switch
                    checked={config.enableLoop}
                    onCheckedChange={(checked) => handleChange("enableLoop", checked)}
                  />
                </div>
                <CardDescription>对每个私钥重复执行交易</CardDescription>
              </CardHeader>
              <CardContent>
                {config.enableLoop ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="loopCount" className="min-w-20">
                        循环次数
                      </Label>
                      <Input
                        id="loopCount"
                        type="number"
                        min={1}
                        max={100}
                        value={config.loopCount}
                        onChange={(e) => handleChange("loopCount", Math.max(1, Number.parseInt(e.target.value) || 1))}
                        className="max-w-24"
                      />
                    </div>
                    <p className="text-xs text-gray-500">每个私钥将执行指定次数的交易</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-sm text-gray-500">
                    启用此选项以设置循环执行次数
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 随机化设置卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Shuffle className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base">随机化设置</CardTitle>
                </div>
                <CardDescription>随机化交易参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 随机金额 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="randomizeAmount">随机化金额</Label>
                    <Switch
                      id="randomizeAmount"
                      checked={config.randomizeAmount}
                      onCheckedChange={(checked) => handleChange("randomizeAmount", checked)}
                    />
                  </div>
                  {config.randomizeAmount && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <Label htmlFor="minAmount" className="text-xs">
                          最小金额
                        </Label>
                        <Input
                          id="minAmount"
                          value={config.minAmount}
                          onChange={(e) => handleChange("minAmount", e.target.value)}
                          placeholder="例如: 0.01"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxAmount" className="text-xs">
                          最大金额
                        </Label>
                        <Input
                          id="maxAmount"
                          value={config.maxAmount}
                          onChange={(e) => handleChange("maxAmount", e.target.value)}
                          placeholder="例如: 0.1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 随机地址 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="randomizeAddress">随机化目标地址</Label>
                    <Switch
                      id="randomizeAddress"
                      checked={config.randomizeAddress}
                      onCheckedChange={(checked) => handleChange("randomizeAddress", checked)}
                    />
                  </div>
                  {config.randomizeAddress && (
                    <div className="space-y-1 mt-2">
                      <Label htmlFor="addressList" className="text-xs">
                        地址列表（每行一个）
                      </Label>
                      <Textarea
                        id="addressList"
                        className="font-mono text-xs"
                        placeholder="0x..."
                        value={config.addressList.join("\n")}
                        onChange={(e) =>
                          handleChange(
                            "addressList",
                            e.target.value.split("\n").filter((a) => a.trim()),
                          )
                        }
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 添加新的选项卡或部分 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings2 className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base">Gas估算设置</CardTitle>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">配置Gas估算失败时的行为</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>设置Gas估算失败时的处理方式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="continueOnGasEstimationFailure">Gas估算失败时继续执行</Label>
                  <Switch
                    id="continueOnGasEstimationFailure"
                    checked={config.continueOnGasEstimationFailure}
                    onCheckedChange={(checked) => handleChange("continueOnGasEstimationFailure", checked)}
                  />
                </div>
                {config.continueOnGasEstimationFailure && (
                  <div className="space-y-2">
                    <Label htmlFor="defaultGasLimit">默认Gas限制</Label>
                    <Input
                      id="defaultGasLimit"
                      placeholder="例如: 180000"
                      value={config.defaultGasLimit}
                      onChange={(e) => handleChange("defaultGasLimit", e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      当Gas估算失败时使用的默认Gas限制值。建议设置为180000或更高。
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isExecuting ? (
            <Button onClick={onStop} className="w-full mt-4 bg-red-600 hover:bg-red-700" size="lg">
              <StopCircle className="mr-2 h-4 w-4" />
              停止执行
            </Button>
          ) : (
            <Button onClick={onExecute} disabled={isExecuting} className="w-full mt-4" size="lg">
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  执行中...
                </>
              ) : (
                "开始执行"
              )}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
