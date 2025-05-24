"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Download, Trash2, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react"
import type { TransactionResult } from "@/types/transaction-result"

interface TransactionResultsTableProps {
  results: TransactionResult[]
  onClearResults: () => void
  onExportCSV: () => void
  blockExplorerUrl?: string
}

export function TransactionResultsTable({
  results,
  onClearResults,
  onExportCSV,
  blockExplorerUrl,
}: TransactionResultsTableProps) {
  const openExplorer = (txHash: string) => {
    if (blockExplorerUrl && txHash !== "待处理") {
      window.open(`${blockExplorerUrl}/tx/${txHash}`, "_blank")
    }
  }

  const getStatusBadge = (status: TransactionResult["status"]) => {
    switch (status) {
      case "成功":
        return (
          <Badge variant="secondary" className="whitespace-nowrap bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            成功
          </Badge>
        )
      case "失败":
        return (
          <Badge variant="destructive" className="whitespace-nowrap">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        )
      case "处理中":
        return (
          <Badge variant="outline" className="whitespace-nowrap bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            处理中
          </Badge>
        )
      case "等待重试":
        return (
          <Badge variant="outline" className="whitespace-nowrap bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            等待重试
          </Badge>
        )
      case "等待处理":
      default:
        return (
          <Badge variant="outline" className="whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" />
            等待处理
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>交易结果</CardTitle>
          <CardDescription>每行对应一个地址的交易结果</CardDescription>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{results.length} 条记录</Badge>
          {results.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={onExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                导出CSV
              </Button>
              <Button size="sm" variant="outline" onClick={onClearResults}>
                <Trash2 className="h-4 w-4 mr-1" />
                清空
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">暂无交易结果</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>发送方</TableHead>
                  <TableHead>接收方</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead>交易哈希</TableHead>
                  <TableHead className="text-right w-[100px]">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="max-w-[120px] truncate" title={result.sender}>
                        {result.sender}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="max-w-[120px] truncate" title={result.recipient}>
                        {result.recipient}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.amount} {result.tokenSymbol}
                    </TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {result.txHash === "待处理" ? (
                        <span className="text-gray-400">待处理</span>
                      ) : blockExplorerUrl ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openExplorer(result.txHash)}
                                className="flex items-center text-blue-500 hover:text-blue-700 hover:underline max-w-[150px]"
                              >
                                <span className="truncate">{result.txHash}</span>
                                <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>点击查看交易详情</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="max-w-[150px] truncate" title={result.txHash}>
                          {result.txHash}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">{result.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
