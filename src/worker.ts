let isShuttingDown = false;

async function worker() {
    while (!isShuttingDown) {
        try {
            const task = await prisma?.$queryRawUnsafe<any[]>(`
                update  "Task"
                set status = 'RUNNING',
                    "startedAt" = new()
                where id =(
                    select t.id from "Task" t
                    where t.status = 'QUEUED'
                    and t."runAt" <= now()
                    and not exists (
                        select 1 from "TaskDependency" td
                        join "Task" dep on td."dependsOnId" = dep.id
                        where td."taskId" = t.id
                        and dep.status != 'SUCCESS'
                    )
                    order by t."runAt" ASC, t."createdAt" ASC
                    for update skip locked
                    limit 1
                )
                returning *;
                `)
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}