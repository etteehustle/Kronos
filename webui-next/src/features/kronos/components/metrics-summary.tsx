import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "../lib/format";

export type PredictionMetrics = {
  mae: number;
  rmse: number;
  mape: number;
};

export function MetricsSummary({ metrics }: { metrics: PredictionMetrics }) {
  return (
    <div className="grid gap-3 p-5 lg:grid-cols-3">
      {[
        ["MAE", metrics.mae, "Sai số tuyệt đối trung bình"],
        ["RMSE", metrics.rmse, "Căn sai số bình phương trung bình"],
        ["MAPE", metrics.mape, "Sai số phần trăm tuyệt đối trung bình"],
      ].map(([label, value, hint]) => (
        <Card key={label} className="rounded-md border-[#e5ebf3] bg-[#f8fafc] py-4">
          <CardContent>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#2563eb]">
              {typeof value === "number"
                ? label === "MAPE"
                  ? `${formatNumber(value, 2)}%`
                  : formatNumber(value, 4)
                : "--"}
            </div>
            <div className="mt-1 text-xs text-[#667085]">{hint}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
