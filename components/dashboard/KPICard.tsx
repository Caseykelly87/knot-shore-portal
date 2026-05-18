import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KPIAccent = "deep-navy" | "kelp-green" | "sea-glass" | "shore-rust";

interface KPICardProps {
  label: string;
  value: string;
  helperText?: string;
  accent?: KPIAccent;
  className?: string;
}

const ACCENT_BORDER: Record<KPIAccent, string> = {
  "deep-navy": "border-l-brand-deep-navy",
  "kelp-green": "border-l-brand-kelp-green",
  "sea-glass": "border-l-brand-sea-glass",
  "shore-rust": "border-l-brand-shore-rust",
};

export function KPICard({ label, value, helperText, accent, className }: KPICardProps) {
  return (
    <Card
      className={cn(
        accent && `border-l-4 ${ACCENT_BORDER[accent]}`,
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight tabular-nums text-brand-deep-navy">
          {value}
        </div>
        {helperText && (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        )}
      </CardContent>
    </Card>
  );
}
