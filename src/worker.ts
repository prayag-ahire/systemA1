import prisma from "./lib/prisma";

let isShuttingDown = false;
const MAX_CONCURRENT_TASKS = 3;
let runningCount = 0;

async function executeTask(task: any) {
    await new Promise((resolve) => {
        const num = Math.random() * 10000
        if (num > 8000) {
            throw new Error("task fail")
        }
        setTimeout(resolve, task.durationMs);
    })
}


async function handleFailure(task: any) {
    const nextAttempt = task.attempts + 1;

    if (nextAttempt >= task.maxAttempts) {
        await prisma.task.update({
            where: { id: task.id },
            data: {
                status: "FAILED",
                attempts: nextAttempt,
                startedAt: null
            },
        });
    } else {
        const backoffSec = Math.pow(2, nextAttempt);
        const nextRunAt = new Date(Date.now() + backoffSec * 1000);

        await prisma.task.update({
            where: { id: task.id },
            data: {
                status: "QUEUED",
                attempts: nextAttempt,
                runAt: nextRunAt,
                startedAt: null
            },
        });
    }
}


async function executeWithTracking(task: any) {
    try {
        await executeTask(task);

        await prisma.task.update({
            where: { id: task.id },
            data: { status: "COMPLETED", startedAt: null },
        });

    } catch (execError) {
        await handleFailure(task);
    } finally {
        runningCount--;
    }
}


async function worker() {
    while (!isShuttingDown) {
        try {
            const task1 = await prisma.$queryRawUnsafe<any[]>(`
                update  "Task"
                set status = 'RUNNING',
                    "startedAt" = now()
                where id =(
                    select t.id from "Task" t
                    where t.status = 'QUEUED'
                    and t."runAt" <= now()
                    and not exists (
                        select 1 from "TaskDependency" td
                        join "Task" dep on td."dependsOnId" = dep.id
                        where td."taskId" = t.id
                        and dep.status != 'COMPLETED'
                    )
                    order by t."runAt" ASC, t."createdAt" ASC
                    for update skip locked
                    limit 1
                )
                returning *;
                `);

            const task = task1[0];

            if (!task) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 2500);
                })
                continue;
            }
            try {
                if (runningCount >= MAX_CONCURRENT_TASKS) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    continue;
                }
                runningCount++;
                executeWithTracking(task);

            } catch (error) {
                console.error("Error scheduling task:", error);
                await handleFailure(task);
            }
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}

async function cleanup() {
    const savenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
        const deleted = await prisma.task.deleteMany({
            where: {
                status: { in: ["COMPLETED", "FAILED"] },
                createdAt: { lt: savenDays }
            }
        })
        if (deleted.count > 0) {
            console.log(`Deleted ${deleted.count} old tasks`)
        }
    } catch {
        console.log("error in cleanup")
    }
}

async function recoverStuckTasks() {
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000);

    try {
        const recovered = await prisma.task.updateMany({
            where: {
                status: "RUNNING",
                startedAt: { lt: fiveMin }
            },
            data: {
                status: "QUEUED",
                startedAt: null
            }
        });

        if (recovered.count > 0) {
            console.log(`Recovered ${recovered.count} stuck tasks`);
        }
    } catch (err) {
        console.error("Maintenance: Failed to recover stuck tasks", err);
    }
}

async function bootstrap() {

    await recoverStuckTasks();

    setInterval(recoverStuckTasks, 60000);
    setInterval(cleanup, 3600000);

    await worker();
}

bootstrap().catch((err) => {
    process.exit(1);
});


const shutdown = async () => {

    if (isShuttingDown) return;

    isShuttingDown = true;
    console.log("Worker is shutting down gracefully");

    setTimeout(async () => {
        console.log("Closing database connection...");
        await prisma.$disconnect();
        console.log("Exit");
        process.exit(0);
    }, 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

worker().catch((err) => {
    process.exit(1);
});
