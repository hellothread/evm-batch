"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock, BarChart } from "lucide-react"

interface TransactionStatsProps {
  total: number
  success: number
  failed: number
  pending: number
}

export function TransactionStats({ total, success, failed, pending }: TransactionStatsProps) {
  // 计算完成百分比
  const completedPercent = total > 0 ? Math.round(((success + failed) / total) * 100) : 0

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${success > 0 && failed === 0 ? "bg-green-600" : failed > 0 ? "bg-amber-500" : "bg-blue-600"}`}
              style={{ width: `${completedPercent}%` }}
            ></div>
          </div>

          {/* 统计数字 */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center text-gray-600 mb-1">
                <BarChart className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">总数</span>
              </div>
              <span className="text-lg font-bold">{total}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center text-green-600 mb-1">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">成功</span>
              </div>
              <span className="text-lg font-bold text-green-600">{success}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center text-red-600 mb-1">
                <XCircle className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">失败</span>
              </div>
              <span className="text-lg font-bold text-red-600">{failed}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center text-blue-600 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">待执行</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{pending}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
