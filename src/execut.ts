import prisma from "./lib/prisma";
import { handleFailure } from "./handleFailure";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const executeTask = async (task: any) => {
    const num = Math.random() * 10000;

    if (num > 8000) {
        throw new Error("task fail");
    }

    await sleep(task.durationMs);
}

export const executeWithTracking = async (task: any) => {
    try {
        await executeTask(task);

        await prisma.task.update({
            where: { id: task.id },
            data: { status: "COMPLETED", startedAt: null },
        });

    } catch (execError) {
        await handleFailure(task);
    }
}