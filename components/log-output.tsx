"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry } from "@/types/log"
import { Trash2 } from "lucide-react"

interface LogOutputProps {
  logs: LogEntry[]
  onClearLogs: () => void
}

export function LogOutput({ logs, onClearLogs }: LogOutputProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 自动滚动到顶部（因为最新的日志现在在顶部）
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = 0
    }
  }, [logs])

  // 修改getLogStyle函数，移除方括号
  const getLogStyle = (level: string) => {
    switch (level) {
      case "info":
        return "text-blue-600 inline-block w-20"
      case "success":
        return "text-green-600 inline-block w-20"
      case "warning":
        return "text-amber-600 inline-block w-20"
      case "error":
        return "text-red-600 inline-block w-20"
      default:
        return "inline-block w-20"
    }
  }

  // 反转日志数组，使最新的日志显示在顶部
  const reversedLogs = [...logs].reverse()

  const formatTimestamp = (timestamp: Date): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">{logs.length > 0 ? `共 ${logs.length} 条日志` : "暂无日志"}</div>
        <Button variant="outline" size="sm" onClick={onClearLogs} disabled={logs.length === 0}>
          <Trash2 className="h-4 w-4 mr-2" />
          清除日志
        </Button>
      </div>

      <div className="border rounded-md">
        <ScrollArea className="h-80" ref={scrollAreaRef}>
          {logs.length > 0 ? (
            <div className="p-4 space-y-2">
              {reversedLogs.map((log, index) => (
                <div key={index} className="text-sm flex">
                  <span className="text-gray-500 whitespace-nowrap">[{formatTimestamp(log.timestamp)}]</span>{" "}
                  <span className={getLogStyle(log.level)}>{log.level.toUpperCase()}:</span>{" "}
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: log.message }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 p-4">日志将在此处显示</div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
