import prisma from "./lib/prisma";
import crypto from "crypto";

async function main() {
    console.log("Generating 20 tasks with mixed dependencies for stress testing...");

    // Clear existing tasks to have a clean view in monitor
    await prisma.taskDependency.deleteMany();
    await prisma.task.deleteMany();

    const tasks: any[] = [];

    // 1. Independent Tasks (5 tasks)
    for (let i = 1; i <= 5; i++) {
        const t = await prisma.task.create({
            data: {
                id: crypto.randomUUID(),
                type: `independent-${i}`,
                payload: { data: i },
                durationMs: 1000 + Math.random() * 2000,
                status: "QUEUED"
            }
        });
        tasks.push(t);
        console.log(`Created Independent Task ${i}: ${t.id}`);
    }

    // 2. Linear Chain (A -> B -> C -> D) (4 tasks)
    let lastId: string | null = null;
    for (let i = 1; i <= 4; i++) {
        const t: any = await prisma.task.create({
            data: {
                id: crypto.randomUUID(),
                type: `chain-${i}`,
                payload: { step: i },
                durationMs: 1500,
                status: "QUEUED",
                dependencies: lastId ? { create: { dependsOnId: lastId } } : undefined
            }
        });
        lastId = t.id;
        console.log(`Created Chain Task ${i}: ${t.id} (depends on ${lastId})`);
    }

    // 3. Fan-out (One parent, many children) (1 parent + 5 children = 6 tasks)
    const fanParent = await prisma.task.create({
        data: {
            id: crypto.randomUUID(),
            type: "fan-parent",
            payload: { type: "root" },
            durationMs: 2000,
            status: "QUEUED"
        }
    });
    console.log(`Created Fan Parent: ${fanParent.id}`);

    for (let i = 1; i <= 5; i++) {
        const t = await prisma.task.create({
            data: {
                id: crypto.randomUUID(),
                type: `fan-child-${i}`,
                payload: { index: i },
                durationMs: 1000 + (i * 500),
                status: "QUEUED",
                dependencies: { create: { dependsOnId: fanParent.id } }
            }
        });
        console.log(`Created Fan Child ${i}: ${t.id}`);
    }

    // 4. Fan-in (Many parents, one child) (Already have independent tasks, let's make a task depend on them) (1 task)
    // Task depends on independent-1, independent-2, independent-3
    const fanInTask = await prisma.task.create({
        data: {
            id: crypto.randomUUID(),
            type: "fan-in-collector",
            payload: { job: "aggregate" },
            durationMs: 2000,
            status: "QUEUED",
            dependencies: {
                create: [
                    { dependsOnId: tasks[0].id }, // independent-1
                    { dependsOnId: tasks[1].id }, // independent-2
                    { dependsOnId: tasks[2].id }  // independent-3
                ]
            }
        }
    });
    console.log(`Created Fan-In Collector: ${fanInTask.id}`);

    // 5. High Concurrency Group (4 independent tasks with short duration)
    for (let i = 1; i <= 4; i++) {
        const t = await prisma.task.create({
            data: {
                id: crypto.randomUUID(),
                type: `burst-${i}`,
                payload: { burst: true },
                durationMs: 500,
                status: "QUEUED"
            }
        });
        console.log(`Created Burst Task ${i}: ${t.id}`);
    }

    console.log("\nTotal tasks created: ~20");
    console.log("Run 'npm run monitor-tasks' to watch the worker handle this load!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
