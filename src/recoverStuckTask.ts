import prisma from "./lib/prisma";

export const recoverStuckTasks = async () => {
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