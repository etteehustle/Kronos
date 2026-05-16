import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { DataInfo, ServerStatus } from "../types";

function ServerStatusDot({ status }: { status: ServerStatus }) {
  const dotClass =
    status === "loading-model"
      ? "bg-amber-500"
      : status === "running"
        ? "bg-emerald-500"
        : status === "offline"
          ? "bg-red-500"
          : "bg-[#98a2b3]";
  const label =
    status === "loading-model"
      ? "Đang tải model"
      : status === "running"
        ? "Đang chạy"
        : status === "offline"
          ? "Không chạy"
          : "Đang kiểm tra";

  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 font-semibold">
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(15,23,42,0.06)]",
          dotClass,
        )}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function StatusSummary({
  dataInfo,
  modelLoaded,
  selectedDevice,
  serverStatus,
}: {
  dataInfo: DataInfo | null;
  modelLoaded: boolean;
  selectedDevice: string;
  serverStatus: ServerStatus;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      <Card className="rounded-md border-[#dce3ee] bg-white py-2">
        <CardContent className="px-3">
          <div className="text-xs font-medium text-[#667085]">Server</div>
          <ServerStatusDot status={serverStatus} />
        </CardContent>
      </Card>
      <Card className="rounded-md border-[#dce3ee] bg-white py-2">
        <CardContent className="px-3">
          <div className="text-xs font-medium text-[#667085]">Model</div>
          <div className="mt-1 font-semibold">{modelLoaded ? "Đã tải" : "Chưa tải"}</div>
        </CardContent>
      </Card>
      <Card className="rounded-md border-[#dce3ee] bg-white py-2">
        <CardContent className="px-3">
          <div className="text-xs font-medium text-[#667085]">Dữ liệu</div>
          <div className="mt-1 font-semibold">{dataInfo ? `${dataInfo.rows} dòng` : "--"}</div>
        </CardContent>
      </Card>
      <Card className="rounded-md border-[#dce3ee] bg-white py-2">
        <CardContent className="px-3">
          <div className="text-xs font-medium text-[#667085]">Thiết bị</div>
          <div className="mt-1 font-semibold uppercase">{selectedDevice}</div>
        </CardContent>
      </Card>
    </div>
  );
}
