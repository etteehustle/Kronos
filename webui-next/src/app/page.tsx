"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Info,
  Loader2,
  Play,
  Power,
  RefreshCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  fetchAvailableModels,
  fetchDataFiles,
  fetchServerHealth,
  loadDataFile,
  loadModel,
  runPrediction,
  unloadModel,
} from "./api";
import { PriceChart } from "./PriceChart";
import type { DataFile, DataInfo, ModelInfo, PredictionResponse, StatusMessage } from "./types";

const LOOKBACK = 400;
const PRED_LEN = 120;
const WINDOW_SIZE = LOOKBACK + PRED_LEN;

type ServerStatus = "checking" | "running" | "offline" | "loading-model";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value?: number, digits = 4) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.min(digits, 2),
  }).format(value);
}

function getWindowDates(dataInfo: DataInfo | null, startPercent: number) {
  if (!dataInfo) return { startDate: null, endDate: null };

  const start = new Date(dataInfo.start_date).getTime();
  const end = new Date(dataInfo.end_date).getTime();
  const windowPercent = Math.min(WINDOW_SIZE / dataInfo.rows, 1);
  const safeStartPercent = Math.min(Math.max(startPercent, 0), Math.max(1 - windowPercent, 0));
  const selectedStart = start + (end - start) * safeStartPercent;
  const selectedEnd = start + (end - start) * Math.min(safeStartPercent + windowPercent, 1);

  return {
    startDate: new Date(selectedStart),
    endDate: new Date(selectedEnd),
  };
}

function getMetrics(result: PredictionResponse | null) {
  if (!result?.prediction_results.length || !result.actual_data.length) {
    return { mae: 0, rmse: 0, mape: 0 };
  }

  const count = Math.min(result.prediction_results.length, result.actual_data.length);
  let mae = 0;
  let rmse = 0;
  let mape = 0;

  for (let index = 0; index < count; index += 1) {
    const prediction = result.prediction_results[index];
    const actual = result.actual_data[index];
    const error = Math.abs(prediction.close - actual.close);
    mae += error;
    rmse += error * error;
    mape += actual.close ? (error / actual.close) * 100 : 0;
  }

  return {
    mae: mae / count,
    rmse: Math.sqrt(rmse / count),
    mape: mape / count,
  };
}

function Status({ status }: { status: StatusMessage | null }) {
  if (!status) return null;

  const Icon = status.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        status.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        status.type === "info" && "border-blue-200 bg-blue-50 text-blue-800",
        status.type === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        status.type === "error" && "border-red-200 bg-red-50 text-red-800",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{status.text}</span>
    </div>
  );
}

function Snackbar({
  status,
  onClose,
}: {
  status: StatusMessage | null;
  onClose: () => void;
}) {
  if (!status) return null;

  const Icon = status.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0"
      data-testid="snackbar"
      role="status"
    >
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.18)]",
          status.type === "success" && "border-emerald-200 text-emerald-800",
          status.type === "info" && "border-blue-200 text-blue-800",
          status.type === "warning" && "border-amber-200 text-amber-800",
          status.type === "error" && "border-red-200 text-red-800",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            status.type === "success" && "bg-emerald-50",
            status.type === "info" && "bg-blue-50",
            status.type === "warning" && "bg-amber-50",
            status.type === "error" && "bg-red-50",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 leading-6">{status.text}</span>
        <button
          aria-label="Đóng thông báo"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#172033]"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#344054]">{children}</label>;
}

function InfoLabel({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#344054]">
      <span>{children}</span>
      <span className="group relative inline-flex">
        <button
          aria-label={`Giải thích: ${tooltip}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#eef4ff] hover:text-[#2563eb] focus-visible:bg-[#eef4ff] focus-visible:text-[#2563eb]"
          type="button"
        >
          <Info className="h-4 w-4" />
        </button>
        <span
          className="pointer-events-none invisible absolute bottom-7 left-1/2 z-30 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-md border border-[#dce3ee] bg-white px-3 py-2 text-xs font-medium leading-5 text-[#344054] opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.14)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          role="tooltip"
        >
          {tooltip}
        </span>
      </span>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eef4ff] text-[#2563eb]">
        {icon}
      </span>
      <h2 className="text-base font-semibold text-[#172033]">{title}</h2>
    </div>
  );
}

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
          "h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(15,23,42,0.06)]",
          dotClass,
        )}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

export default function Home() {
  const [models, setModels] = useState<Record<string, ModelInfo>>({});
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [selectedModel, setSelectedModel] = useState("kronos-mini");
  const [selectedDevice, setSelectedDevice] = useState("cpu");
  const [selectedFile, setSelectedFile] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [snackbar, setSnackbar] = useState<StatusMessage | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [loadingAction, setLoadingAction] = useState<
    "models" | "model" | "unload" | "data" | "predict" | null
  >(null);
  const [startPercent, setStartPercent] = useState(0.1);
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(0.9);
  const [sampleCount, setSampleCount] = useState(1);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const metrics = useMemo(() => getMetrics(result), [result]);
  const windowDates = useMemo(() => getWindowDates(dataInfo, startPercent), [dataInfo, startPercent]);
  const windowPercent = dataInfo ? Math.min((WINDOW_SIZE / dataInfo.rows) * 100, 100) : 0;
  const canPredict = modelLoaded && Boolean(dataInfo) && Boolean(selectedFile);

  const refreshServerStatus = useCallback(async () => {
    try {
      const health = await fetchServerHealth();
      setServerStatus("running");
      setModelLoaded(health.model_loaded);
    } catch {
      setServerStatus("offline");
      setModelLoaded(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoadingAction("models");
      try {
        const [healthResponse, modelsResponse, filesResponse] = await Promise.all([
          fetchServerHealth(),
          fetchAvailableModels(),
          fetchDataFiles(),
        ]);
        setServerStatus("running");
        setModelLoaded(healthResponse.model_loaded);
        setModels(modelsResponse.models);
        setDataFiles(filesResponse);
        const firstFile = filesResponse[0]?.path ?? "";
        setSelectedFile(firstFile);
        setStatus({
          type: "info",
          text: "Đã sẵn sàng. Hãy tải mô hình và dữ liệu để bắt đầu dự báo.",
        });
      } catch (error) {
        setServerStatus("offline");
        setStatus({
          type: "error",
          text: error instanceof Error ? error.message : "Không khởi tạo được giao diện",
        });
      } finally {
        setLoadingAction(null);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (loadingAction === "model") return;

    const interval = window.setInterval(refreshServerStatus, 10000);
    return () => window.clearInterval(interval);
  }, [loadingAction, refreshServerStatus]);

  useEffect(() => {
    if (loadingAction !== "model") return;

    let cancelled = false;

    async function checkLoadedModel() {
      try {
        const health = await fetchServerHealth();
        if (cancelled || !health.model_loaded) return;

        setModelLoaded(true);
        setServerStatus("running");
        setLoadingAction(null);
        setSnackbar({
          type: "success",
          text: "Mô hình đã tải xong và sẵn sàng trên server.",
        });
      } catch {
        if (!cancelled) {
          setServerStatus("offline");
        }
      }
    }

    void checkLoadedModel();
    const interval = window.setInterval(checkLoadedModel, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadingAction]);

  useEffect(() => {
    if (!snackbar) return;

    const timeout = window.setTimeout(() => {
      setSnackbar(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [snackbar]);

  async function handleLoadModel() {
    setLoadingAction("model");
    setServerStatus("loading-model");
    setStatus(null);
    setSnackbar(null);
    try {
      const response = await loadModel(selectedModel, selectedDevice);
      setModelLoaded(true);
      setServerStatus("running");
      setSnackbar({ type: "success", text: response.message });
    } catch (error) {
      setModelLoaded(false);
      setSnackbar(null);
      setServerStatus("running");
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Tải mô hình thất bại",
      });
      void refreshServerStatus();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUnloadModel() {
    setLoadingAction("unload");
    setStatus(null);
    setSnackbar(null);
    try {
      const response = await unloadModel();
      setModelLoaded(false);
      setResult(null);
      setServerStatus("running");
      setSnackbar({ type: "success", text: response.message });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Gỡ mô hình thất bại",
      });
      void refreshServerStatus();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadData() {
    if (!selectedFile) {
      setStatus({ type: "warning", text: "Vui lòng chọn file dữ liệu trước." });
      return;
    }

    setLoadingAction("data");
    setStatus(null);
    try {
      const response = await loadDataFile(selectedFile);
      setDataInfo(response.data_info);
      setResult(null);
      setStartPercent(0.1);
      setStatus({ type: "success", text: response.message });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Tải dữ liệu thất bại",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePredict() {
    if (!dataInfo || !selectedFile) return;

    setLoadingAction("predict");
    setStatus(null);
    try {
      const response = await runPrediction({
        file_path: selectedFile,
        lookback: LOOKBACK,
        pred_len: PRED_LEN,
        start_date: (windowDates.startDate ?? new Date(dataInfo.start_date))
          .toISOString()
          .slice(0, 16),
        temperature,
        top_p: topP,
        sample_count: sampleCount,
      });
      setResult(response);
      setStatus({ type: "success", text: response.message });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Dự báo thất bại",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 text-[#172033] lg:px-8">
      <Snackbar status={snackbar} onClose={() => setSnackbar(null)} />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[#dce3ee] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827] lg:text-3xl">
              Kronos - Dự báo tài chính
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
              Giao diện Next.js mới cho workflow dự báo K-line: tải mô hình, chọn dữ liệu,
              sinh dự báo và so sánh với dữ liệu thực tế trên một màn hình.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-md border border-[#dce3ee] bg-white px-3 py-2">
              <div className="text-xs font-medium text-[#667085]">Server</div>
              <ServerStatusDot status={serverStatus} />
            </div>
            <div className="rounded-md border border-[#dce3ee] bg-white px-3 py-2">
              <div className="text-xs font-medium text-[#667085]">Model</div>
              <div className="mt-1 font-semibold">{modelLoaded ? "Đã tải" : "Chưa tải"}</div>
            </div>
            <div className="rounded-md border border-[#dce3ee] bg-white px-3 py-2">
              <div className="text-xs font-medium text-[#667085]">Dữ liệu</div>
              <div className="mt-1 font-semibold">{dataInfo ? `${dataInfo.rows} dòng` : "--"}</div>
            </div>
            <div className="rounded-md border border-[#dce3ee] bg-white px-3 py-2">
              <div className="text-xs font-medium text-[#667085]">Thiết bị</div>
              <div className="mt-1 font-semibold uppercase">{selectedDevice}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-[#dce3ee] bg-white p-5">
              <SectionTitle icon={<Cpu className="h-4 w-4" />} title="Mô hình" />

              <div className="space-y-4">
                <div>
                  <FieldLabel>Chọn mô hình</FieldLabel>
                  <select
                    className="h-11 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm text-[#172033]"
                    onChange={(event) => setSelectedModel(event.target.value)}
                    value={selectedModel}
                  >
                    {Object.entries(models).map(([key, model]) => (
                      <option key={key} value={key}>
                        {model.name} ({model.params}) - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Thiết bị chạy</FieldLabel>
                  <select
                    className="h-11 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm text-[#172033]"
                    onChange={(event) => setSelectedDevice(event.target.value)}
                    value={selectedDevice}
                  >
                    <option value="cpu">CPU</option>
                    <option value="cuda">CUDA</option>
                    <option value="mps">MPS</option>
                  </select>
                </div>

                <button
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                  disabled={loadingAction === "model" || loadingAction === "unload" || !selectedModel}
                  onClick={handleLoadModel}
                  type="button"
                >
                  {loadingAction === "model" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Tải mô hình
                </button>

                <button
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#f3b7b7] bg-white px-4 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:border-[#dce3ee] disabled:text-[#98a2b3]"
                  disabled={!modelLoaded || loadingAction === "model" || loadingAction === "unload"}
                  onClick={handleUnloadModel}
                  type="button"
                >
                  {loadingAction === "unload" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Gỡ model
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-[#dce3ee] bg-white p-5">
              <SectionTitle icon={<Database className="h-4 w-4" />} title="Dữ liệu" />

              <div className="space-y-4">
                <div>
                  <FieldLabel>Chọn file dữ liệu</FieldLabel>
                  <select
                    className="h-11 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm text-[#172033]"
                    onChange={(event) => setSelectedFile(event.target.value)}
                    value={selectedFile}
                  >
                    <option value="">Chọn file</option>
                    {dataFiles.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.name} ({file.size})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cfd8e6] bg-[#f8fafc] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:text-[#98a2b3]"
                  disabled={loadingAction === "data" || !selectedFile}
                  onClick={handleLoadData}
                  type="button"
                >
                  {loadingAction === "data" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Tải dữ liệu
                </button>

                {dataInfo && (
                  <dl className="grid grid-cols-2 gap-3 rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-[#667085]">Số dòng</dt>
                      <dd className="mt-1 font-semibold">{dataInfo.rows}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#667085]">Khung</dt>
                      <dd className="mt-1 font-semibold">{dataInfo.timeframe}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-semibold text-[#667085]">Thời gian</dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(dataInfo.start_date)} - {formatDate(dataInfo.end_date)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-semibold text-[#667085]">Khoảng giá</dt>
                      <dd className="mt-1 font-medium">
                        {formatNumber(dataInfo.price_range.min)} -{" "}
                        {formatNumber(dataInfo.price_range.max)}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#dce3ee] bg-white p-5">
              <SectionTitle icon={<SlidersHorizontal className="h-4 w-4" />} title="Dự báo" />

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#344054]">Cửa sổ dữ liệu</span>
                    <span className="text-[#667085]">{WINDOW_SIZE} điểm</span>
                  </div>
                  <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
                    <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-[#667085]">
                      <span>Bắt đầu: {formatDate(windowDates.startDate?.toISOString())}</span>
                      <span>Kết thúc: {formatDate(windowDates.endDate?.toISOString())}</span>
                    </div>
                    <input
                      className="w-full accent-[#2563eb]"
                      disabled={!dataInfo}
                      max={Math.max(100 - windowPercent, 0)}
                      min={0}
                      onChange={(event) => setStartPercent(Number(event.target.value) / 100)}
                      step={0.1}
                      type="range"
                      value={Math.min(startPercent * 100, Math.max(100 - windowPercent, 0))}
                    />
                    <div className="mt-2 flex justify-between text-xs text-[#667085]">
                      <span>400 lịch sử</span>
                      <span>120 dự báo</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
                    <div className="text-xs font-semibold text-[#667085]">Lookback</div>
                    <div className="mt-1 text-lg font-semibold">{LOOKBACK}</div>
                  </div>
                  <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
                    <div className="text-xs font-semibold text-[#667085]">Pred len</div>
                    <div className="mt-1 text-lg font-semibold">{PRED_LEN}</div>
                  </div>
                </div>

                <div>
                  <InfoLabel tooltip="Điều chỉnh mức ngẫu nhiên khi model sinh dự báo. Giá trị thấp cho kết quả ổn định hơn; giá trị cao cho dự báo đa dạng hơn nhưng dễ dao động hơn.">
                    Nhiệt độ dự báo: {temperature.toFixed(1)}
                  </InfoLabel>
                  <input
                    className="w-full accent-[#2563eb]"
                    max={2}
                    min={0.1}
                    onChange={(event) => setTemperature(Number(event.target.value))}
                    step={0.1}
                    type="range"
                    value={temperature}
                  />
                </div>

                <div>
                  <InfoLabel tooltip="Giới hạn nhóm khả năng mà model được phép chọn khi dự báo. Top-p thấp làm kết quả thận trọng hơn; Top-p cao cho phép nhiều kịch bản hơn.">
                    Top-p: {topP.toFixed(1)}
                  </InfoLabel>
                  <input
                    className="w-full accent-[#2563eb]"
                    max={1}
                    min={0.1}
                    onChange={(event) => setTopP(Number(event.target.value))}
                    step={0.1}
                    type="range"
                    value={topP}
                  />
                </div>

                <div>
                  <InfoLabel tooltip="Số lần model sinh mẫu dự báo cho cùng một cửa sổ dữ liệu. Số mẫu lớn hơn có thể ổn định kết quả hơn, nhưng sẽ chạy chậm hơn.">
                    Số mẫu dự báo
                  </InfoLabel>
                  <input
                    className="h-11 w-full rounded-md border border-[#cfd8e6] px-3 text-sm"
                    max={5}
                    min={1}
                    onChange={(event) => setSampleCount(Number(event.target.value))}
                    type="number"
                    value={sampleCount}
                  />
                </div>

                <button
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0f9f6e] px-4 text-sm font-semibold text-white transition hover:bg-[#087f5b] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                  disabled={!canPredict || loadingAction === "predict"}
                  onClick={handlePredict}
                  type="button"
                >
                  {loadingAction === "predict" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Bắt đầu dự báo
                </button>
              </div>
            </section>

            <Status status={status} />
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <PriceChart result={result} />

            <section className="rounded-lg border border-[#dce3ee] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#e7edf5] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#172033]">So sánh dự báo</h2>
                  <p className="mt-1 text-sm text-[#667085]">
                    {result?.prediction_type ?? "Chạy dự báo để xem sai số và bảng chi tiết."}
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-[#2563eb]" />
              </div>

              <div className="grid gap-3 p-5 lg:grid-cols-3">
                {[
                  ["MAE", metrics.mae, "Sai số tuyệt đối trung bình"],
                  ["RMSE", metrics.rmse, "Căn sai số bình phương trung bình"],
                  ["MAPE", metrics.mape, "Sai số phần trăm tuyệt đối trung bình"],
                ].map(([label, value, hint]) => (
                  <div key={label} className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-4">
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
                  </div>
                ))}
              </div>

              <div className="max-h-[420px] overflow-auto border-t border-[#e7edf5]">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-[#f8fafc] text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    <tr>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-left">Thời gian</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Open TT</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Open DB</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">High TT</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">High DB</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Low TT</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Low DB</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Close TT</th>
                      <th className="border-b border-[#e5ebf3] px-4 py-3 text-right">Close DB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.prediction_results.length ? (
                      result.prediction_results.slice(0, 120).map((prediction, index) => {
                        const actual = result.actual_data[index];
                        return (
                          <tr key={`${prediction.timestamp}-${index}`} className="hover:bg-[#f8fafc]">
                            <td className="border-b border-[#edf1f7] px-4 py-3 font-mono text-xs">
                              {formatDate(prediction.timestamp)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(actual?.open)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(prediction.open)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(actual?.high)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(prediction.high)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(actual?.low)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(prediction.low)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(actual?.close)}
                            </td>
                            <td className="border-b border-[#edf1f7] px-4 py-3 text-right">
                              {formatNumber(prediction.close)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-12 text-center text-[#667085]" colSpan={9}>
                          Bảng so sánh sẽ xuất hiện sau khi chạy dự báo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
