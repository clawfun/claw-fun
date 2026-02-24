import { Keypair } from "@solana/web3.js";

interface StartMessage {
  type: "start";
  suffix: string;
}

interface StopMessage {
  type: "stop";
}

type WorkerMessage = StartMessage | StopMessage;

let isRunning = false;
let suffix = "claw";

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  if (type === "start") {
    suffix = (e.data as StartMessage).suffix.toLowerCase();
    isRunning = true;
    mine();
  } else if (type === "stop") {
    isRunning = false;
  }
};

function mine() {
  const batchSize = 1000;
  let attempts = 0;
  let lastReportTime = performance.now();
  let lastReportAttempts = 0;

  function runBatch() {
    if (!isRunning) return;

    for (let i = 0; i < batchSize; i++) {
      if (!isRunning) return;

      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();
      attempts++;

      // Check if address ends with suffix (case-insensitive)
      if (address.toLowerCase().endsWith(suffix)) {
        self.postMessage({
          type: "found",
          keypair: Array.from(keypair.secretKey),
          address,
        });
        isRunning = false;
        return;
      }
    }

    // Report progress every 500ms
    const now = performance.now();
    if (now - lastReportTime >= 500) {
      const elapsed = (now - lastReportTime) / 1000;
      const attemptsDelta = attempts - lastReportAttempts;
      const rate = attemptsDelta / elapsed;

      self.postMessage({
        type: "progress",
        attempts: attemptsDelta,
        rate,
      });

      lastReportTime = now;
      lastReportAttempts = attempts;
    }

    // Continue mining
    setTimeout(runBatch, 0);
  }

  runBatch();
}
