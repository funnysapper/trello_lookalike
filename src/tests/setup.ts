import { beforeEach, afterAll } from 'vitest';
import prisma from '../config/prisma.ts';

console.log('TEST DB:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL?.includes('trello_test')) {
    throw new Error('Refusing to run tests against the wrong database');
}

beforeEach(async ()=>{
    await prisma.card.deleteMany();
    await prisma.column.deleteMany();
    await prisma.board.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
})

afterAll(async ()=>{
    await prisma.$disconnect();
})