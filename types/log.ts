export interface LogEntry {
  timestamp: Date
  level: "info" | "success" | "warning" | "error"
  message: string
}
