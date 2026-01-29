const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

export type TimeEntry = {
  id: number;
  date: string; // ISO
  project: string;
  hours: number;
  description: string;
  createdAt: string; // ISO
};

export type CreateEntryPayload = {
  date: string; // YYYY-MM-DD
  project: string;
  hours: number;
  description: string;
};

export async function getEntries(): Promise<TimeEntry[]> {
  const res = await fetch(`${API_URL}/entries`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load entries");
  return res.json();
}

export async function createEntry(payload: CreateEntryPayload): Promise<TimeEntry> {
  const res = await fetch(`${API_URL}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Failed to create entry");
  return data;
}
