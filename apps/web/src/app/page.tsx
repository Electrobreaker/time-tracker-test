"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEntry, deleteEntry, getEntries, type CreateEntryPayload, type TimeEntry } from "@/lib/api";

const PROJECTS = ["Viso Internal", "Client A", "Client B", "Personal Development"] as const;
type Project = (typeof PROJECTS)[number];

const MAX_HOURS_PER_DAY = 24;

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

type FilterMode = "all" | "month";
type Grouped = { date: string; entries: TimeEntry[]; total: number };

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDDMMYYYY(isoOrDate: string): string {
  const d = isoOrDate.slice(0, 10); // YYYY-MM-DD
  const yyyy = d.slice(0, 4);
  const mm = d.slice(5, 7);
  const dd = d.slice(8, 10);
  return `${dd}-${mm}-${yyyy}`;
}


function dateKeyFromIso(isoOrDate: string): string {
  return isoOrDate.length >= 10 ? isoOrDate.slice(0, 10) : isoOrDate;
}

function toYYYYMM(isoOrDate: string): { yyyy: string; mm: string } {
  const d = dateKeyFromIso(isoOrDate);
  return { yyyy: d.slice(0, 4), mm: d.slice(5, 7) };
}

function sumHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
}

function groupByDate(entries: TimeEntry[]): Grouped[] {
  const map = new Map<string, TimeEntry[]>();

  for (const e of entries) {
    const key = dateKeyFromIso(e.date);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }

  const groups: Grouped[] = [];
  for (const [date, list] of map.entries()) {
    const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    groups.push({ date, entries: sorted, total: sumHours(sorted) });
  }

  return groups.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export default function Page() {
  // Form
  const [date, setDate] = useState<string>(todayYYYYMMDD());
  const [project, setProject] = useState<Project>(PROJECTS[0]);
  const [hours, setHours] = useState<string>("1");
  const [description, setDescription] = useState<string>("");

  // Data
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntries();
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(toYYYYMM(e.date).yyyy);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [entries]);

  useEffect(() => {
    if (availableYears.length && !filterYear) setFilterYear(availableYears[0]);
  }, [availableYears, filterYear]);

  const availableMonthsForYear = useMemo(() => {
    if (!filterYear) return [];
    const set = new Set<string>();
    for (const e of entries) {
      const { yyyy, mm } = toYYYYMM(e.date);
      if (yyyy === filterYear) set.add(mm);
    }
    return Array.from(set).sort();
  }, [entries, filterYear]);

  useEffect(() => {
    if (filterYear && availableMonthsForYear.length && !filterMonth) {
      setFilterMonth(availableMonthsForYear[0]);
    }
  }, [filterYear, availableMonthsForYear, filterMonth]);

  const filteredEntries = useMemo(() => {
    if (filterMode === "all") return entries;
    if (!filterYear || !filterMonth) return entries;

    return entries.filter((e) => {
      const { yyyy, mm } = toYYYYMM(e.date);
      return yyyy === filterYear && mm === filterMonth;
    });
  }, [entries, filterMode, filterYear, filterMonth]);

  const grouped = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);
  const grandTotal = useMemo(() => grouped.reduce((sum, g) => sum + g.total, 0), [grouped]);

  const currentDayTotal = useMemo(() => {
    return grouped.find((g) => g.date === date)?.total ?? 0;
  }, [grouped, date]);

  const openDatePicker = useCallback(() => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else {
      el.focus();
      el.click();
    }
  }, []);

  const onSave = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const hoursNum = Number(hours);
    if (!date || !project || !description.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      setError("Hours must be a positive number.");
      return;
    }
    if (currentDayTotal + hoursNum > MAX_HOURS_PER_DAY) {
      setError(`This would exceed ${MAX_HOURS_PER_DAY} hours for ${date}.`);
      return;
    }

    const payload: CreateEntryPayload = {
      date,
      project,
      hours: hoursNum,
      description: description.trim(),
    };

    setSaving(true);
    try {
      await createEntry(payload);
      setSuccess("Saved!");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [date, project, hours, description, currentDayTotal, load]);

  const onDelete = useCallback(
    async (id: number) => {
      setError(null);
      setSuccess(null);

      const ok = confirm("Delete this entry?");
      if (!ok) return;

      const typed = prompt('Type "DELETE" to confirm:');
      if (typed !== "DELETE") return;

      try {
        await deleteEntry(id);
        setSuccess("Deleted!");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    },
    [load]
  );

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Time Tracker</h1>

      {/* Time Entry */}
      <section className="rounded-xl border p-4 space-y-4">
        <h2 className="text-lg font-medium">Time Entry</h2>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-md border border-green-400 bg-green-100 p-3 text-sm text-green-700">{success}</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Date</div>
            <div className="relative">
              <input
                ref={dateInputRef}
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="no-native-picker w-full rounded-md border px-3 py-2 pr-10"
              />
              <button
                type="button"
                aria-label="Open date picker"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-700 hover:bg-gray-100"
                onClick={openDatePicker}
              >
                <CalendarIcon />
              </button>
            </div>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Project</div>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value as Project)}
              className="w-full rounded-md border px-3 py-2"
            >
              {PROJECTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Hours</div>
            <input
              type="number"
              min={0}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>

          <div className="flex items-end">
            <button
              onClick={onSave}
              disabled={saving || loading}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <label className="space-y-1 block">
          <div className="text-sm font-medium">Work description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            rows={4}
            placeholder="What did you work on?"
          />
        </label>
      </section>

      {/* Entry History */}
      <section className="rounded-xl border p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm">
              <div className="font-medium">Entry History</div>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="mt-1 rounded-md border px-3 py-2"
              >
                <option value="all">Show all</option>
                <option value="month">Filter by month</option>
              </select>
            </label>

            {filterMode === "month" && (
              <>
                <label className="text-sm">
                  <div className="font-medium">Year</div>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setFilterMonth("");
                    }}
                    className="mt-1 rounded-md border px-3 py-2"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="font-medium">Month</div>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="mt-1 rounded-md border px-3 py-2"
                  >
                    {availableMonthsForYear.map((mm) => (
                      <option key={mm} value={mm}>
                        {MONTHS.find((m) => m.value === mm)?.label ?? mm}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          <div className="text-sm">
            Grand total: <span className="font-semibold">{grandTotal.toFixed(2)}</span>h
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-gray-600">No entries yet.</div>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.date} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold">{g.date}</div>
                  <div className="text-sm">
                    Total: <span className="font-semibold">{g.total.toFixed(2)}</span>h
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 w-36">Date</th>
                        <th className="text-left p-2 w-48">Project</th>
                        <th className="text-left p-2 w-24">Hours</th>
                        <th className="text-left p-2">Description</th>
                        <th className="p-2 text-right w-0 whitespace-nowrap" />
                      </tr>
                    </thead>
                    <tbody>
                      {g.entries.map((e) => (
                        <tr key={e.id} className="border-t">
                          <td className="p-2">{formatDDMMYYYY(e.date)}</td>
                          <td className="p-2">{e.project}</td>
                          <td className="p-2">{Number(e.hours).toFixed(2)}</td>
                          <td className="p-2">{e.description}</td>
                          <td className="p-2 text-right w-0 whitespace-nowrap">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                aria-label="Delete entry"
                                title="Delete"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => onDelete(e.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
