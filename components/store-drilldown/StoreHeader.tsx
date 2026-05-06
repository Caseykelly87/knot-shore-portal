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
  "suburban-family": "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "urban-dense": "bg-blue-500/10 text-blue-700 border-blue-200",
  "value-market": "bg-amber-500/10 text-amber-700 border-amber-200",
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
            <h1 className="text-3xl font-bold tracking-tight">{storeName}</h1>
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
            <span className="font-medium text-foreground">{sqft.toLocaleString()}</span> sq ft
          </div>
          <div>
            Opened <span className="font-medium text-foreground">{formatOpenDate(openDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
