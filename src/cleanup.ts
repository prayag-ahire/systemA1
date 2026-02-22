import prisma from "./lib/prisma";

export const cleanup = async () => {
    const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
        const deleted = await prisma.task.deleteMany({
            where: {
                status: { in: ["COMPLETED", "FAILED"] },
                createdAt: { lt: sevenDays }
            }
        })
        if (deleted.count > 0) {
            console.log(`Deleted ${deleted.count} old tasks`)
        }
    } catch {
        console.log("error in cleanup")
    }
}