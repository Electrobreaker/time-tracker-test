import express from "express";
import cors from "cors";
import { prisma } from "./prisma";
import { CreateEntrySchema, MAX_HOURS_PER_DAY } from "./entries.schema";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/entries", async (_req, res) => {
  const entries = await prisma.timeEntry.findMany({ orderBy: [{ date: "desc" }, { id: "desc" }] });
  res.json(entries);
});

app.post("/entries", async (req, res) => {
  const parsed = CreateEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error", details: parsed.error.flatten() });

  const { date, project, hours, description } = parsed.data;

  // date-only -> UTC day range
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const agg = await prisma.timeEntry.aggregate({
    where: { date: { gte: dayStart, lte: dayEnd } },
    _sum: { hours: true }
  });

  const existing = agg._sum.hours ?? 0;
  if (existing + hours > MAX_HOURS_PER_DAY) {
    return res.status(400).json({ message: `Max ${MAX_HOURS_PER_DAY} hours per day exceeded` });
  }

  const created = await prisma.timeEntry.create({
    data: { date: dayStart, project, hours, description },
  });

  res.status(201).json(created);
});

app.delete("/entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    await prisma.timeEntry.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    // Prisma кидає помилку, якщо запис не знайдено
    return res.status(404).json({ message: "Entry not found" });
  }
});


app.listen(3001, () => console.log("API on http://localhost:3001"));
