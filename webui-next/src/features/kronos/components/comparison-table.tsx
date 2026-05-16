import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "../lib/format";
import type { PredictionResponse } from "../types";

export function ComparisonTable({ result }: { result: PredictionResponse | null }) {
  return (
    <div className="max-h-[420px] overflow-auto border-t border-[#e7edf5]">
      <Table className="min-w-[920px] border-collapse">
        <TableHeader className="sticky top-0 bg-[#f8fafc] text-xs font-semibold uppercase tracking-wide text-[#667085]">
          <TableRow>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-left">Thời gian</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Open TT</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Open DB</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">High TT</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">High DB</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Low TT</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Low DB</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Close TT</TableHead>
            <TableHead className="border-b border-[#e5ebf3] px-4 py-3 text-right">Close DB</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result?.prediction_results.length ? (
            result.prediction_results.slice(0, 120).map((prediction, index) => {
              const actual = result.actual_data[index];
              return (
                <TableRow key={`${prediction.timestamp}-${index}`} className="hover:bg-[#f8fafc]">
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 font-mono text-xs">
                    {formatDate(prediction.timestamp)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(actual?.open)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(prediction.open)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(actual?.high)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(prediction.high)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(actual?.low)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(prediction.low)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(actual?.close)}
                  </TableCell>
                  <TableCell className="border-b border-[#edf1f7] px-4 py-3 text-right">
                    {formatNumber(prediction.close)}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell className="px-4 py-12 text-center text-[#667085]" colSpan={9}>
                Bảng so sánh sẽ xuất hiện sau khi chạy dự báo.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
