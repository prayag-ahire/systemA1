import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { TaskSchema } from "./schemas/task";
import prisma from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 3000;
const Limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many request please try again later",
});

app.use(Limiter);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/task", async (req, res) => {
    try {

        const tasks = await prisma?.task.findMany({
            orderBy: { createdAt: "desc" },
        });
        return res.json(tasks);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/task/:id", async (req, res) => {
    try {
        const tasks = await prisma?.task.findUnique({
            where: { id: req.params.id }
        })

        if (!tasks) return res.status(404).json({ error: "Task not found" });
        return res.json(tasks);

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/task", async (req, res) => {
    try {
        const validated = TaskSchema.safeParse(req.body);

        if (!validated.success) {
            return res.status(400).json({
                error: "Invalid input data",
                details: validated.error.flatten(),
            });
        }
        const { id, type, payload, durationMs, runAt, maxAttempts, dependsOn } = validated.data;

        const task = await prisma.task.create({
            data: {
                id: id ?? crypto.randomUUID(),
                type,
                payload,
                durationMs,
                status: "QUEUED",
                maxAttempts: maxAttempts ?? 3,
                runAt: runAt ? new Date(runAt) : new Date(),
                dependencies: dependsOn ? {
                    create: dependsOn.map(depId => ({
                        dependsOnId: depId
                    }))
                } : undefined
            },
        });
        return res.status(201).json(task);

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});