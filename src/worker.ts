import prisma from "./lib/prisma";
import { handleFailure } from "./handleFailure";
import { sleep } from "./execut";
import { executeWithTracking } from "./execut";

export let isShuttingDown = false;
export const setShuttingDown = (val: boolean) => { isShuttingDown = val; };

const MAX_CONCURRENT_TASKS = 3;
let runningCount = 0;

export const worker = async () => {
    while (!isShuttingDown) {
        try {
            if (runningCount >= MAX_CONCURRENT_TASKS) {
                await sleep(500);
                continue;
            }
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
                await sleep(2500);
                continue;
            }
            try {
                if (runningCount >= MAX_CONCURRENT_TASKS) {
                    await sleep(500);
                    continue;
                }
                runningCount++;
                executeWithTracking(task).finally(() => {
                    runningCount--;
                });

            } catch (error) {
                console.error("Error scheduling task:", error);
                await handleFailure(task);
            }
        } catch (error) {
            await sleep(5000);
        }
    }
}
