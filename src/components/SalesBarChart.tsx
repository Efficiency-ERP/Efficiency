import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTND } from '@/lib/utils'

type BarDatum = { label: string; value: number; onClick?: () => void }

export default function SalesBarChart({
  data,
  maxValue,
  heightPx = 160,
  gapPx = 12,
}: {
  data: BarDatum[]
  maxValue?: number
  heightPx?: number
  gapPx?: number
}) {
  const max = Math.max(1, maxValue ?? Math.max(...data.map((d) => d.value)))
  return (
    <div
      className="grid items-end w-full"
      style={{
        height: `${heightPx}px`,
        gap: `${gapPx}px`,
        gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
      }}
    >
      {data.map((d) => {
        const h = Math.round((d.value / max) * (heightPx - 40))
        return (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role={d.onClick ? 'button' : undefined}
                  tabIndex={d.onClick ? 0 : -1}
                  onClick={d.onClick}
                  className="bg-chart-1 w-full rounded-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ height: `${h}px` }}
                  aria-label={`${d.label} ${formatTND(d.value)}`}
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-primary-foreground/80">{formatTND(d.value)}</span>
                </div>
              </TooltipContent>
            </Tooltip>
            <div className="text-xs text-muted-foreground">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}
