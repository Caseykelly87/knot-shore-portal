import { notFound } from "next/navigation";
import {
  fetchDepartmentData,
  isValidDepartmentId,
  type DepartmentData,
} from "@/lib/department-data";
import { DepartmentHeader } from "@/components/departments/DepartmentHeader";
import { DepartmentKPICards } from "@/components/departments/DepartmentKPICards";
import { DepartmentByStoreChart } from "@/components/departments/DepartmentByStoreChart";
import { DepartmentTrendChart } from "@/components/departments/DepartmentTrendChart";

const TOTAL_KNOWN_STORES = 8;

interface DepartmentPageProps {
  params: { id: string };
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const departmentId = parseInt(params.id, 10);
  if (isNaN(departmentId) || !isValidDepartmentId(departmentId)) {
    notFound();
  }

  let data: DepartmentData;
  try {
    data = await fetchDepartmentData(departmentId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <DepartmentHeader
        departmentName={data.departmentName}
        windowStart={data.windowStart}
        windowEnd={data.windowEnd}
        storeCoverage={data.storeCoverage}
        totalStores={TOTAL_KNOWN_STORES}
      />

      <DepartmentKPICards
        totalSales={data.totalSales}
        totalTransactions={data.totalTransactions}
        avgDailySales={data.avgDailySales}
        revenueShare={data.revenueShare}
        kpiDeltas={data.kpiDeltas}
      />

      <DepartmentByStoreChart data={data.byStore} />

      <DepartmentTrendChart data={data.trend} />
    </div>
  );
}
