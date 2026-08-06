import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const mebibyte = 1024 * 1024;
const samplesPerCandidate = 4;

const candidates = [
  { name: "owasp-128m", N: 2 ** 17, r: 8, p: 1 },
  { name: "owasp-64m", N: 2 ** 16, r: 8, p: 2 },
  { name: "owasp-32m", N: 2 ** 15, r: 8, p: 3 },
  { name: "owasp-16m", N: 2 ** 14, r: 8, p: 5 },
] as const;

type Candidate = (typeof candidates)[number];

type WorkerResult = Candidate & {
  configuredMemoryMiB: number;
  observedPeakRssDeltaMiB: number;
  latencyMs: number[];
  medianLatencyMs: number;
  maximumLatencyMs: number;
  maximumTimerDelayMs: number;
};

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

async function benchmarkCandidate(candidate: Candidate): Promise<WorkerResult> {
  const configuredMemoryBytes = 128 * candidate.N * candidate.r;
  const baselineRss = process.memoryUsage().rss;
  let peakRss = baselineRss;
  let maximumTimerDelayMs = 0;
  let previousTimerTick = performance.now();
  const timerIntervalMs = 5;
  const timer = setInterval(() => {
    const now = performance.now();
    maximumTimerDelayMs = Math.max(
      maximumTimerDelayMs,
      now - previousTimerTick - timerIntervalMs,
    );
    previousTimerTick = now;
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }, timerIntervalMs);

  const latencyMs: number[] = [];

  try {
    for (let index = 0; index < samplesPerCandidate; index += 1) {
      const startedAt = performance.now();
      await scryptAsync(
        `benchmark-password-${index}-${"x".repeat(96)}`,
        randomBytes(16),
        64,
        {
          N: candidate.N,
          r: candidate.r,
          p: candidate.p,
          maxmem: configuredMemoryBytes + 32 * mebibyte,
        },
      );
      latencyMs.push(performance.now() - startedAt);
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  } finally {
    clearInterval(timer);
  }

  return {
    ...candidate,
    configuredMemoryMiB: configuredMemoryBytes / mebibyte,
    observedPeakRssDeltaMiB: Math.max(0, peakRss - baselineRss) / mebibyte,
    latencyMs,
    medianLatencyMs: percentile(latencyMs, 0.5),
    maximumLatencyMs: Math.max(...latencyMs),
    maximumTimerDelayMs,
  };
}

async function runWorker(candidateName: string) {
  const candidate = candidates.find(({ name }) => name === candidateName);

  if (!candidate) {
    throw new Error(`Unknown benchmark candidate: ${candidateName}`);
  }

  process.stdout.write(JSON.stringify(await benchmarkCandidate(candidate)));
}

function runIsolatedCandidate(candidate: Candidate) {
  return new Promise<WorkerResult>((resolve, reject) => {
    const scriptPath = path.resolve(process.argv[1]);
    const child = spawn(
      process.execPath,
      ["--import", "tsx", scriptPath, "--worker", candidate.name],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${candidate.name} exited with code ${code}: ${stderr.trim()}`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout) as WorkerResult);
      } catch (error) {
        reject(
          new Error(
            `Could not parse ${candidate.name} output: ${stdout}\n${String(error)}`,
          ),
        );
      }
    });
  });
}

async function main() {
  const workerIndex = process.argv.indexOf("--worker");

  if (workerIndex >= 0) {
    await runWorker(process.argv[workerIndex + 1] ?? "");
    return;
  }

  console.log(
    JSON.stringify(
      {
        runtime: process.version,
        platform: `${process.platform}/${process.arch}`,
        logicalCpuCount: os.cpus().length,
        totalMemoryMiB: Math.round(os.totalmem() / mebibyte),
        samplesPerCandidate,
        note: "Each OWASP scrypt profile runs in a fresh process via the asynchronous Node.js API.",
      },
      null,
      2,
    ),
  );

  const results: WorkerResult[] = [];

  for (const candidate of candidates) {
    results.push(await runIsolatedCandidate(candidate));
  }

  console.table(
    results.map((result) => ({
      candidate: result.name,
      N: result.N,
      r: result.r,
      p: result.p,
      configuredMemoryMiB: result.configuredMemoryMiB,
      observedPeakRssDeltaMiB: result.observedPeakRssDeltaMiB.toFixed(1),
      medianLatencyMs: result.medianLatencyMs.toFixed(1),
      maximumLatencyMs: result.maximumLatencyMs.toFixed(1),
      maximumTimerDelayMs: result.maximumTimerDelayMs.toFixed(1),
    })),
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
