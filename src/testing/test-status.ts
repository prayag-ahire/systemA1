import prisma from "../lib/prisma";

async function monitor() {
    console.log("Monitoring task progress (Ctrl+C to stop)...\n");

    while (true) {
        const tasks = await prisma.task.findMany({
            orderBy: { createdAt: "asc" },
            include: {
                dependencies: true
            }
        });

        console.clear();
        console.log(`Current Time: ${new Date().toLocaleTimeString()}`);
        console.log("------------------------------------------------------------------");
        console.log("ID".padEnd(38) + " | " + "STATUS".padEnd(10) + " | " + "TYPE");
        console.log("------------------------------------------------------------------");

        let allDone = true;
        tasks.forEach(task => {
            console.log(`${task.id.padEnd(38)} | ${task.status.padEnd(10)} | ${task.type}`);
            if (task.status !== "COMPLETED" && task.status !== "FAILED") {
                allDone = false;
            }
        });

        if (tasks.length === 0) {
            console.log("No tasks found.");
            break;
        }

        if (allDone) {
            console.log("------------------------------------------------------------------");
            console.log("All tasks have finished processing!");
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

monitor()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
