import type { AuditItem } from './types'

/** 针对一个「只有说法」的能力点，生成一条追问 */
export function questionFor(item: AuditItem): string {
  return `「${item.label}」目前只有说法、在代码里没找到对应痕迹。你是在哪个文件或依赖里实现的？给个线索（文件路径、依赖名，或一句话说明）。`
}
