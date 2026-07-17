import { Badge } from "@/components/ui/badge"

export function PmeBadge() {
  return <Badge variant="secondary" className="ml-1">My PME</Badge>
}

export function pmeItemClassName(isMine: boolean) {
  return isMine ? "bg-primary/10 font-medium" : undefined
}

export function sortMyPmeFirst<T>(items: T[], isMine: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => Number(isMine(b)) - Number(isMine(a)))
}
