"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PredictionResponse } from "@/features/kronos/types";

type PlotlyTrace = {
  x: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  name?: string;
};

type PlotlyChartPayload = {
  data: PlotlyTrace[];
};

type PriceChartProps = {
  result: PredictionResponse | null;
};

function toCandles(trace: PlotlyTrace): CandlestickData<UTCTimestamp>[] {
  const length = Math.min(
    trace.x?.length ?? 0,
    trace.open?.length ?? 0,
    trace.high?.length ?? 0,
    trace.low?.length ?? 0,
    trace.close?.length ?? 0,
  );

  return Array.from({ length }, (_, index) => ({
    time: Math.floor(new Date(trace.x[index]).getTime() / 1000) as UTCTimestamp,
    open: Number(trace.open[index]),
    high: Number(trace.high[index]),
    low: Number(trace.low[index]),
    close: Number(trace.close[index]),
  }));
}

export function PriceChart({ result }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick">[]>([]);

  useEffect(() => {
    if (!containerRef.current || !result) return;

    const container = containerRef.current;
    container.innerHTML = "";
    seriesRef.current = [];

    const chart = createChart(container, {
      autoSize: true,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#344054",
        fontFamily: "Geist, Segoe UI, sans-serif",
      },
      grid: {
        vertLines: { color: "#edf1f7" },
        horzLines: { color: "#edf1f7" },
      },
      rightPriceScale: {
        borderColor: "#d9e1ec",
        scaleMargins: { top: 0.12, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#d9e1ec",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#64748b",
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          color: "#64748b",
          style: LineStyle.Dashed,
          width: 1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const styles = [
      {
        upColor: "#12b886",
        downColor: "#ef4444",
        borderUpColor: "#12b886",
        borderDownColor: "#ef4444",
        wickUpColor: "#12b886",
        wickDownColor: "#ef4444",
      },
      {
        upColor: "#2563eb",
        downColor: "#1d4ed8",
        borderUpColor: "#2563eb",
        borderDownColor: "#1d4ed8",
        wickUpColor: "#2563eb",
        wickDownColor: "#1d4ed8",
      },
      {
        upColor: "#f97316",
        downColor: "#dc2626",
        borderUpColor: "#f97316",
        borderDownColor: "#dc2626",
        wickUpColor: "#f97316",
        wickDownColor: "#dc2626",
      },
    ];

    const parsed = JSON.parse(result.chart) as PlotlyChartPayload;
    parsed.data.forEach((trace, index) => {
      const candles = toCandles(trace);
      if (!candles.length) return;

      const series = chart.addSeries(CandlestickSeries, {
        ...styles[index],
        priceFormat: {
          type: "price",
          precision: 4,
          minMove: 0.0001,
        },
      });
      series.setData(candles);
      seriesRef.current.push(series);
    });

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = [];
    };
  }, [result]);

  return (
    <Card className="rounded-lg border-[#dce3ee] bg-white">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[#172033]">Biểu đồ dự báo</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Kéo để pan, cuộn chuột để zoom, rê chuột để xem crosshair.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 border-[#cfd8e6] text-[#344054] hover:bg-[#f3f6fb]"
          onClick={() => chartRef.current?.timeScale().fitContent()}
          type="button"
        >
          Vừa khung
        </Button>
      </CardHeader>
      <Separator className="bg-[#e7edf5]" />

      <CardContent className="p-0">
        <div className="flex flex-wrap gap-4 px-5 py-3 text-sm font-medium text-[#344054]">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#12b886]" />
            Lịch sử
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563eb]" />
            Dự báo
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#f97316]" />
            Thực tế
          </span>
        </div>

        <div ref={containerRef} className="h-[560px] w-full" />

        {!result && (
          <div className="flex h-[560px] items-center justify-center border-t border-[#eef2f7] text-sm text-[#667085]">
            Chưa có dữ liệu dự báo. Tải mô hình, tải dữ liệu, rồi bấm bắt đầu dự báo.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
