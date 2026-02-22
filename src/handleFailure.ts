import prisma from "./lib/prisma";

export const handleFailure = async (task: any) => {
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
