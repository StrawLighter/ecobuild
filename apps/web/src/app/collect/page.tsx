"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { verifyWaste, type VerifyResult } from "@/lib/api";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);
import { useBlockBalance } from "@/lib/hooks";
import { explorerTxUrl } from "@/lib/constants";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ImagePlus,
} from "lucide-react";

type Stage = "idle" | "uploading" | "success" | "error";

export default function CollectPage() {
  const { publicKey, connected } = useWallet();
  const { refresh: refreshBalance } = useBlockBalance();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStage("idle");
    setResult(null);
    setErrorMsg("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) handleFile(f);
    },
    [handleFile]
  );

  const submit = async () => {
    if (!file || !publicKey) return;
    setStage("uploading");
    setErrorMsg("");
    try {
      const data = await verifyWaste(file, publicKey.toBase58());
      setResult(data);
      if (data.ok && data.verified) {
        setStage("success");
        refreshBalance();
      } else {
        setStage("error");
        setErrorMsg(data.reason || data.error || "Verification failed");
      }
    } catch (err: unknown) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error — is the verifier running?");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStage("idle");
    setResult(null);
    setErrorMsg("");
  };

  /* ---------- Not connected ---------- */
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <Camera className="h-16 w-16 text-stone-300" />
        <h1 className="text-2xl font-bold text-stone-900">
          Connect Your Wallet to Collect
        </h1>
        <p className="max-w-md text-stone-500">
          Upload a photo of collected waste to have it verified by AI and earn
          BLOCK tokens.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  /* ---------- Connected ---------- */
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Collect Waste</h1>
        <p className="text-stone-500">
          Upload a photo of waste you collected. Our AI will verify and reward
          you with BLOCK tokens.
        </p>
      </div>

      {/* Drop zone / Preview */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          preview
            ? "border-eco-300 bg-eco-50"
            : "border-stone-300 bg-stone-50 hover:border-eco-400 hover:bg-eco-50"
        } ${stage === "uploading" ? "pointer-events-none opacity-60" : ""}`}
        style={{ minHeight: 280 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="max-h-72 rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <ImagePlus className="h-12 w-12 text-stone-400" />
            <p className="font-medium text-stone-600">
              Drag & drop an image or click to browse
            </p>
            <p className="text-sm text-stone-400">PNG, JPG up to 10 MB</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {file && stage !== "uploading" && (
          <button
            onClick={reset}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            Clear
          </button>
        )}
        <button
          disabled={!file || stage === "uploading"}
          onClick={submit}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-eco-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-eco-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stage === "uploading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Verify & Earn
            </>
          )}
        </button>
      </div>

      {/* Result card */}
      {stage === "success" && result && (
        <div className="space-y-3 rounded-xl border border-eco-200 bg-eco-50 p-5">
          <div className="flex items-center gap-2 text-eco-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Waste Verified!</span>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Kv
              label="Material"
              value={result.classification?.waste_type ?? "—"}
            />
            <Kv
              label="Weight"
              value={`${result.classification?.estimated_weight_lbs ?? 0} lbs`}
            />
            <Kv
              label="Confidence"
              value={`${Math.round(
                (result.classification?.confidence ?? 0) * 100
              )}%`}
            />
            <Kv label="BLOCKs Earned" value={result.blocksMinted ?? 0} />
          </div>
          {result.classification?.description && (
            <p className="text-sm text-stone-600">
              {result.classification.description}
            </p>
          )}
          {result.transaction && (
            <a
              href={explorerTxUrl(result.transaction)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-eco-600 hover:underline"
            >
              View transaction <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={reset}
            className="w-full rounded-lg bg-eco-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-eco-700"
          >
            Collect Another
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-700">Verification Failed</p>
            <p className="text-sm text-red-600">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-stone-500">{label}:</span>{" "}
      <span className="font-medium text-stone-800">{String(value)}</span>
    </div>
  );
}
