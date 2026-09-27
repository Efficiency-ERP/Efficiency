import { Badge } from "@/components/ui/badge"

export function OrganizationBadge() {
  return <Badge variant="secondary" className="ml-1">Mon organisation</Badge>
}

// Shown on a document whose counterparty is another organization of the same
// group — see isInterco in useMyOrganization.
export function IntercoBadge() {
  return <Badge variant="outline" className="ml-2 border-primary/40 text-primary">Interco</Badge>
}

export function organizationItemClassName(isMine: boolean) {
  return isMine ? "bg-primary/10 font-medium" : undefined
}

export function sortMyOrganizationsFirst<T>(items: T[], isMine: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => Number(isMine(b)) - Number(isMine(a)))
}
