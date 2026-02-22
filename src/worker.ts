import prisma from "./lib/prisma";

let isShuttingDown = false;

async function executeTask() {
    await new Promise((resolve) => {
        const num = Math.random() * 10000
        if (num > 8000) {
            throw new Error("task fail")
        }
        setTimeout(resolve, 1000);
    })
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
                await executeTask();
                await prisma.task.update({
                    where: { id: task.id },
                    data: { status: "COMPLETED", startedAt: null },
                });
            } catch (error) {
                await prisma.task.update({
                    where: { id: task.id },
                    data: { status: "FAILED", startedAt: null },
                });
            }
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}