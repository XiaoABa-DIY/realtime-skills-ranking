import type { CandidatesPayload, SnapshotPayload } from "../types";

const baseUrl = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`.replace(/\/{2,}/g, "/"));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadSnapshot() {
  return fetchJson<SnapshotPayload>("data/snapshot.json");
}

export async function loadCandidates() {
  return fetchJson<CandidatesPayload>("data/candidates.json");
}
