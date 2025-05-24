"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PrivateKeyInputProps {
  onPrivateKeysChange: (privateKeys: string[]) => void
  disabled?: boolean
}

export function PrivateKeyInput({ onPrivateKeysChange, disabled = false }: PrivateKeyInputProps) {
  const [privateKeysText, setPrivateKeysText] = useState("")
  const [validKeys, setValidKeys] = useState<string[]>([])
  const [invalidLines, setInvalidLines] = useState<number[]>([])

  // 验证私钥格式
  const validatePrivateKey = (key: string): boolean => {
    // 移除0x前缀后应该是64个十六进制字符
    const hexKey = key.startsWith("0x") ? key.slice(2) : key
    return /^[0-9a-fA-F]{64}$/.test(hexKey)
  }

  // 当文本变化时，解析和验证私钥
  useEffect(() => {
    const lines = privateKeysText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const invalid: number[] = []
    const valid: string[] = []

    lines.forEach((line, index) => {
      if (validatePrivateKey(line)) {
        // 确保私钥有0x前缀
        const formattedKey = line.startsWith("0x") ? line : `0x${line}`
        valid.push(formattedKey)
      } else if (line.length > 0) {
        invalid.push(index + 1) // 行号从1开始
      }
    })

    setValidKeys(valid)
    setInvalidLines(invalid)
    onPrivateKeysChange(valid)
  }, [privateKeysText, onPrivateKeysChange])

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          警告：私钥是您资产的唯一凭证，请确保在安全的环境下输入，离线操作更安全。我们不会存储您的私钥。
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="privateKeys">输入私钥（每行一个）</Label>
          <div className="flex items-center gap-2">
            {validKeys.length > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                有效: {validKeys.length}
              </Badge>
            )}
            {invalidLines.length > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                无效: {invalidLines.length}
              </Badge>
            )}
          </div>
        </div>
        <Textarea
          id="privateKeys"
          placeholder="输入私钥，每行一个..."
          value={privateKeysText}
          onChange={(e) => setPrivateKeysText(e.target.value)}
          className="font-mono h-32"
          disabled={disabled}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">支持标准的十六进制私钥格式（64个十六进制字符，可选择性支持0x前缀）</p>
          {invalidLines.length > 0 && <p className="text-xs text-red-500">无效行: {invalidLines.join(", ")}</p>}
        </div>
      </div>
    </div>
  )
}
