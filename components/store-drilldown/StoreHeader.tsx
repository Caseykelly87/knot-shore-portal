import { Card, CardContent } from "@/components/ui/card";

interface StoreHeaderProps {
  storeName: string;
  address: string;
  city: string;
  zip: string;
  tradeAreaProfile: string;
  sqft: number;
  openDate: string;
}

const TRADE_AREA_LABELS: Record<string, string> = {
  "suburban-family": "Suburban / Family",
  "urban-dense": "Urban / Dense",
  "value-market": "Value Market",
};

const TRADE_AREA_BADGE_STYLES: Record<string, string> = {
  "suburban-family":
    "bg-brand-kelp-green/10 text-brand-kelp-green border-brand-kelp-green/30",
  "urban-dense":
    "bg-brand-sea-glass/15 text-brand-deep-navy border-brand-sea-glass/40",
  "value-market":
    "bg-severity-warning/15 text-severity-warning-strong border-severity-warning/40",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatOpenDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function StoreHeader({
  storeName,
  address,
  city,
  zip,
  tradeAreaProfile,
  sqft,
  openDate,
}: StoreHeaderProps) {
  const tradeLabel = TRADE_AREA_LABELS[tradeAreaProfile] ?? tradeAreaProfile;
  const tradeBadge =
    TRADE_AREA_BADGE_STYLES[tradeAreaProfile] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
              {storeName}
            </h1>
            <p className="text-muted-foreground">
              {address} · {city}, MO {zip}
            </p>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${tradeBadge}`}
          >
            {tradeLabel}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium tabular-nums text-brand-deep-navy">{sqft.toLocaleString()}</span> sq ft
          </div>
          <div>
            Opened <span className="font-medium text-brand-deep-navy">{formatOpenDate(openDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
