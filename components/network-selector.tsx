"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { NetworkConfig } from "@/types/network"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 预设网络列表
const PRESET_NETWORKS: NetworkConfig[] = [
  {
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    chainId: 1,
    currencySymbol: "ETH",
    blockExplorerUrl: "https://etherscan.io",
  },
  {
    name: "Sepolia Testnet",
    rpcUrl: "https://ethereum-sepolia.publicnode.com",
    chainId: 11155111,
    currencySymbol: "ETH",
    blockExplorerUrl: "https://sepolia.etherscan.io",
  },
  {
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    currencySymbol: "ARB",
    blockExplorerUrl: "https://arbiscan.io",
  },
  {
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    chainId: 10,
    currencySymbol: "OP",
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
  {
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    chainId: 56,
    currencySymbol: "BNB",
    blockExplorerUrl: "https://bscscan.com",
  },
  {
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    currencySymbol: "MATIC",
    blockExplorerUrl: "https://polygonscan.com",
  },
  {
    name: "Avalanche C-Chain",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    chainId: 43114,
    currencySymbol: "AVAX",
    blockExplorerUrl: "https://snowtrace.io",
  },
]

// localStorage键名
const STORAGE_KEY = "web3_batch_tool_custom_networks"

interface NetworkSelectorProps {
  selectedNetwork: NetworkConfig
  onNetworkChange: (network: NetworkConfig) => void
}

export function NetworkSelector({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) {
  const [customNetworks, setCustomNetworks] = useState<NetworkConfig[]>([])
  const [newNetwork, setNewNetwork] = useState<NetworkConfig>({
    name: "",
    rpcUrl: "",
    chainId: 0,
    currencySymbol: "",
    blockExplorerUrl: "",
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<NetworkConfig | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [networkToDelete, setNetworkToDelete] = useState<NetworkConfig | null>(null)

  // 从localStorage加载自定义网络
  useEffect(() => {
    const storedNetworks = localStorage.getItem(STORAGE_KEY)
    if (storedNetworks) {
      try {
        const parsedNetworks = JSON.parse(storedNetworks)
        setCustomNetworks(parsedNetworks)
      } catch (error) {
        console.error("Failed to parse stored networks:", error)
      }
    }
  }, [])

  // 保存自定义网络到localStorage
  const saveCustomNetworksToStorage = (networks: NetworkConfig[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(networks))
  }

  // 处理网络选择变化
  const handleNetworkChange = (value: string) => {
    if (value === "custom") {
      // 重置表单
      setNewNetwork({
        name: "",
        rpcUrl: "",
        chainId: 0,
        currencySymbol: "",
        blockExplorerUrl: "",
      })
      setIsEditing(false)
      setDialogOpen(true)
      return
    }

    // 查找选择的网络
    const allNetworks = [...PRESET_NETWORKS, ...customNetworks]
    const network = allNetworks.find((n) => n.name === value)

    if (network) {
      onNetworkChange(network)
    }
  }

  // 处理自定义网络字段变化
  const handleNetworkFormChange = (field: keyof NetworkConfig, value: string | number) => {
    if (isEditing && editingNetwork) {
      setEditingNetwork({
        ...editingNetwork,
        [field]: value,
      })
    } else {
      setNewNetwork({
        ...newNetwork,
        [field]: value,
      })
    }
  }

  // 添加自定义网络
  const handleAddCustomNetwork = () => {
    // 验证必填字段
    const networkToValidate = isEditing ? editingNetwork : newNetwork
    if (
      !networkToValidate ||
      !networkToValidate.name ||
      !networkToValidate.rpcUrl ||
      !networkToValidate.chainId ||
      !networkToValidate.currencySymbol
    ) {
      alert("请填写所有必填字段")
      return
    }

    if (isEditing && editingNetwork) {
      // 更新现有网络
      const updatedNetworks = customNetworks.map((network) =>
        network.name === editingNetwork.name ? editingNetwork : network,
      )
      setCustomNetworks(updatedNetworks)
      saveCustomNetworksToStorage(updatedNetworks)

      // 如果当前选中的是被编辑的网络，更新选中的网络
      if (selectedNetwork.name === editingNetwork.name) {
        onNetworkChange(editingNetwork)
      }
    } else {
      // 添加新网络
      const updatedCustomNetworks = [...customNetworks, newNetwork]
      setCustomNetworks(updatedCustomNetworks)
      saveCustomNetworksToStorage(updatedCustomNetworks)
      onNetworkChange(newNetwork)
    }

    setDialogOpen(false)
    setIsEditing(false)
    setEditingNetwork(null)

    // 重置表单
    setNewNetwork({
      name: "",
      rpcUrl: "",
      chainId: 0,
      currencySymbol: "",
      blockExplorerUrl: "",
    })
  }

  // 编辑网络
  const handleEditNetwork = (network: NetworkConfig) => {
    setEditingNetwork(network)
    setIsEditing(true)
    setDialogOpen(true)
  }

  // 删除网络
  const handleDeleteNetwork = (network: NetworkConfig) => {
    setNetworkToDelete(network)
    setDeleteConfirmOpen(true)
  }

  // 确认删除网络
  const confirmDeleteNetwork = () => {
    if (!networkToDelete) return

    const updatedNetworks = customNetworks.filter((network) => network.name !== networkToDelete.name)
    setCustomNetworks(updatedNetworks)
    saveCustomNetworksToStorage(updatedNetworks)

    // 如果删除的是当前选中的网络，切换到默认网络
    if (selectedNetwork.name === networkToDelete.name) {
      onNetworkChange(PRESET_NETWORKS[0])
    }

    setDeleteConfirmOpen(false)
    setNetworkToDelete(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="network">选择网络</Label>
          <div className="flex flex-col space-y-2">
            <Select value={selectedNetwork.name} onValueChange={handleNetworkChange}>
              <SelectTrigger id="network">
                <SelectValue placeholder="选择网络" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <div className="flex items-center">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加自定义网络
                  </div>
                </SelectItem>

                {/* 预设网络 */}
                <div className="px-2 py-1.5 text-sm font-semibold">预设网络</div>
                {PRESET_NETWORKS.map((network) => (
                  <SelectItem key={network.chainId} value={network.name}>
                    {network.name} ({network.currencySymbol})
                  </SelectItem>
                ))}

                {/* 自定义网络 */}
                {customNetworks.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold">自定义网络</div>
                    {customNetworks.map((network) => (
                      <SelectItem key={network.name} value={network.name}>
                        {network.name} ({network.currencySymbol})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* 自定义网络管理 */}
            {customNetworks.length > 0 && (
              <div className="border rounded-md p-2">
                <h3 className="text-sm font-medium mb-2">自定义网络管理</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {customNetworks.map((network) => (
                    <div
                      key={network.name}
                      className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 rounded-sm"
                    >
                      <span className="text-sm truncate flex-1">{network.name}</span>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditNetwork(network)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">编辑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteNetwork(network)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">删除</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 显示当前选择的网络信息 */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>RPC URL</Label>
            <div className="mt-1 text-sm text-gray-700 break-all">{selectedNetwork.rpcUrl}</div>
          </div>
          <div>
            <Label>Chain ID</Label>
            <div className="mt-1 text-sm text-gray-700">{selectedNetwork.chainId}</div>
          </div>
          <div>
            <Label>货币符号</Label>
            <div className="mt-1 text-sm text-gray-700">{selectedNetwork.currencySymbol}</div>
          </div>
          <div>
            <Label>区块浏览器</Label>
            <div className="mt-1 text-sm text-gray-700 break-all">{selectedNetwork.blockExplorerUrl || "未设置"}</div>
          </div>
        </div>
      </div>

      {/* 添加/编辑自定义网络对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑网络" : "添加自定义网络"}</DialogTitle>
            <DialogDescription>输入自定义EVM兼容网络的详细信息</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="networkName">网络名称 *</Label>
              <Input
                id="networkName"
                value={isEditing && editingNetwork ? editingNetwork.name : newNetwork.name}
                onChange={(e) => handleNetworkFormChange("name", e.target.value)}
                placeholder="例如: Fantom Opera"
                disabled={isEditing} // 编辑时不允许修改名称，作为唯一标识符
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="rpcUrl">RPC URL *</Label>
              <Input
                id="rpcUrl"
                value={isEditing && editingNetwork ? editingNetwork.rpcUrl : newNetwork.rpcUrl}
                onChange={(e) => handleNetworkFormChange("rpcUrl", e.target.value)}
                placeholder="例如: https://rpc.ftm.tools"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chainId">Chain ID *</Label>
                <Input
                  id="chainId"
                  type="number"
                  value={isEditing && editingNetwork ? editingNetwork.chainId || "" : newNetwork.chainId || ""}
                  onChange={(e) => handleNetworkFormChange("chainId", Number.parseInt(e.target.value))}
                  placeholder="例如: 250"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencySymbol">货币符号 *</Label>
                <Input
                  id="currencySymbol"
                  value={isEditing && editingNetwork ? editingNetwork.currencySymbol : newNetwork.currencySymbol}
                  onChange={(e) => handleNetworkFormChange("currencySymbol", e.target.value)}
                  placeholder="例如: FTM"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="blockExplorerUrl">区块浏览器 URL (可选)</Label>
              <Input
                id="blockExplorerUrl"
                value={isEditing && editingNetwork ? editingNetwork.blockExplorerUrl : newNetwork.blockExplorerUrl}
                onChange={(e) => handleNetworkFormChange("blockExplorerUrl", e.target.value)}
                placeholder="例如: https://ftmscan.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setIsEditing(false)
                setEditingNetwork(null)
              }}
            >
              取消
            </Button>
            <Button onClick={handleAddCustomNetwork}>{isEditing ? "保存修改" : "添加网络"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除网络 "{networkToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmOpen(false)
                setNetworkToDelete(null)
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNetwork} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
