//core state machine logic
import  PrismaClient  from '@prisma/client';

const prisma = new prisma;

export const submitTask = async (input)=>{ 
    return prisma.$transaction(async (tx)=>{
        
        const remaining = input.dependencies.length;

        await tx.task.create({
            data:{
                id:input.id,
                type:input.type,
                
            }
        })
    })
}