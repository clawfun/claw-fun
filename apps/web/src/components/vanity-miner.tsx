"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { Play, Pause, Cpu } from "lucide-react";

interface VanityMinerProps {
  suffix?: string;
  onFound: (keypair: Keypair) => void;
}

interface WorkerMessage {
  type: "progress" | "found" | "error";
  attempts?: number;
  rate?: number;
  keypair?: number[];
  address?: string;
  error?: string;
}

export function VanityMiner({ suffix = "claw", onFound }: VanityMinerProps) {
  const [isMining, setIsMining] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [rate, setRate] = useState(0);
  const [workerCount, setWorkerCount] = useState(
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4
  );
  const workersRef = useRef<Worker[]>([]);
  const foundRef = useRef(false);

  const startMining = useCallback(() => {
    if (foundRef.current) return;

    setIsMining(true);
    setAttempts(0);
    setRate(0);
    foundRef.current = false;

    // Create workers
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL("../workers/vanity-miner.worker.ts", import.meta.url)
      );

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (foundRef.current) return;

        const { type, attempts: workerAttempts, rate: workerRate, keypair, address } = e.data;

        if (type === "progress") {
          setAttempts((prev) => prev + (workerAttempts || 0));
          setRate((prev) => prev + (workerRate || 0) / workerCount);
        } else if (type === "found" && keypair && address) {
          foundRef.current = true;
          stopMining();

          const kp = Keypair.fromSecretKey(Uint8Array.from(keypair));
          onFound(kp);
        }
      };

      worker.onerror = (e) => {
        console.error("Worker error:", e);
      };

      worker.postMessage({
        type: "start",
        suffix: suffix.toLowerCase(),
      });

      workersRef.current.push(worker);
    }
  }, [workerCount, suffix, onFound]);

  const stopMining = useCallback(() => {
    setIsMining(false);
    setRate(0);

    workersRef.current.forEach((worker) => {
      worker.postMessage({ type: "stop" });
      worker.terminate();
    });
    workersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      stopMining();
    };
  }, [stopMining]);

  // Calculate expected attempts
  const suffixLen = suffix.length;
  const expectedAttempts = Math.pow(58, suffixLen);
  const progress = (attempts / expectedAttempts) * 100;
  const eta = rate > 0 ? (expectedAttempts - attempts) / rate : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-claw-400" />
          <span className="text-sm text-dark-400">
            Workers: {workerCount} threads
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-dark-800 rounded"
            onClick={() => setWorkerCount(Math.max(1, workerCount - 1))}
            disabled={isMining}
          >
            -
          </button>
          <span className="w-8 text-center">{workerCount}</span>
          <button
            className="p-1 hover:bg-dark-800 rounded"
            onClick={() =>
              setWorkerCount(Math.min(navigator.hardwareConcurrency || 8, workerCount + 1))
            }
            disabled={isMining}
          >
            +
          </button>
        </div>
      </div>

      <div className="p-4 bg-dark-800 rounded-lg space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Suffix:</span>
          <span className="font-mono text-claw-400">{suffix}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Attempts:</span>
          <span className="font-mono">{formatNumber(attempts)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Rate:</span>
          <span className="font-mono">{formatNumber(Math.round(rate))}/s</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Expected:</span>
          <span className="font-mono">~{formatNumber(expectedAttempts)}</span>
        </div>
        {isMining && eta > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">ETA:</span>
            <span className="font-mono">
              {eta < 60
                ? `${Math.round(eta)}s`
                : eta < 3600
                ? `${Math.round(eta / 60)}m`
                : `${Math.round(eta / 3600)}h`}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-claw-500 transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <Button
        className="w-full"
        variant={isMining ? "danger" : "primary"}
        onClick={isMining ? stopMining : startMining}
      >
        {isMining ? (
          <>
            <Pause className="w-4 h-4 mr-2" />
            Stop Mining
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Start Mining
          </>
        )}
      </Button>

      <p className="text-xs text-dark-500 text-center">
        Mining happens in your browser. No data is sent to any server.
      </p>
    </div>
  );
}
