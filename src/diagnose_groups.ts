import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const data: any = {};

    data.users = await prisma.user.findMany({ select: { id: true, username: true } });

    data.groups = await prisma.group.findMany({
        include: {
            members: {
                include: {
                    user: { select: { username: true } }
                }
            }
        }
    });

    fs.writeFileSync('diagnose_results.json', JSON.stringify(data, null, 2));
    console.log('Results written to diagnose_results.json');
}

main()
    .catch(e => {
        console.error(e);
        fs.writeFileSync('diagnose_error.txt', e.toString());
    })
    .finally(async () => await prisma.$disconnect());
