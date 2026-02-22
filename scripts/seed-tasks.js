const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/task`;

async function createTask(name, data = {}, options = {}) {
    const payload = {
        type: name,
        payload: data,
        durationMs: options.duration || 2000,
        maxAttempts: options.maxAttempts || 3,
        ...options
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            console.error(`Failed to create task ${name}:`, result);
            return null;
        }
        console.log(`Created task: ${name} (ID: ${result.id})`);
        return result;
    } catch (error) {
        console.error(`Error creating task ${name}:`, error.message);
        return null;
    }
}

async function runTest() {
    console.log("--- Starting Task Seeding ---");

    // 1. Create a simple task
    await createTask("EmailNotification", { to: "user@example.com", body: "Welcome!" });

    // 2. Create a heavy task
    await createTask("ImageProcessing", { file: "profile.jpg", size: "large" }, { duration: 5000 });

    // 3. Create a dependency chain
    console.log("\n--- Creating Dependent Tasks ---");

    const parentTask = await createTask("DatabaseBackup", { db: "main" }, { duration: 3000 });

    if (parentTask) {
        // This task will only run AFTER the backup is completed
        await createTask("UploadToS3", { file: "backup.sql" }, {
            dependsOn: [parentTask.id],
            duration: 1000
        });
    }

    // 4. Create a task for the future (1 minute from now)
    const runAt = new Date(Date.now() + 60000).toISOString();
    await createTask("ScheduledCleanup", { all: true }, { runAt });

    console.log("\n--- Seeding Complete ---");
    console.log("Check your worker logs to see them being processed.");
}

runTest();
