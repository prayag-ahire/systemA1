import { recoverStuckTasks } from "./recoverStuckTask";
import { cleanup } from "./cleanup";
import { worker, workerState } from "./worker";
import prisma from "./lib/prisma";

export const bootstrap = async () => {

    await recoverStuckTasks();

    setInterval(recoverStuckTasks, 60000);
    setInterval(cleanup, 3600000);

    await worker();
}

bootstrap().catch((err) => {
    process.exit(1);
});


const shutdown = async () => {

    if (workerState.isShuttingDown) return;
    workerState.isShuttingDown = true;
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