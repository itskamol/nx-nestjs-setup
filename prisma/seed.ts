import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: Role.ADMIN,
            isActive: true,
        },
    });

    // Create regular user
    const userPassword = await bcrypt.hash('User123!', 12);
    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            password: userPassword,
            firstName: 'Regular',
            lastName: 'User',
            role: Role.USER,
            isActive: true,
        },
    });

    // Create moderator user
    const moderatorPassword = await bcrypt.hash('Moderator123!', 12);
    const moderator = await prisma.user.upsert({
        where: { email: 'moderator@example.com' },
        update: {},
        create: {
            email: 'moderator@example.com',
            password: moderatorPassword,
            firstName: 'Moderator',
            lastName: 'User',
            role: Role.MODERATOR,
            isActive: true,
        },
    });

    // Create some additional test users for development
    if (process.env['NODE_ENV'] === 'development') {
        const testUsers = [
            {
                email: 'john.doe@example.com',
                password: 'TestUser123!',
                firstName: 'John',
                lastName: 'Doe',
                role: Role.USER,
            },
            {
                email: 'jane.smith@example.com',
                password: 'TestUser123!',
                firstName: 'Jane',
                lastName: 'Smith',
                role: Role.USER,
            },
            {
                email: 'bob.wilson@example.com',
                password: 'TestUser123!',
                firstName: 'Bob',
                lastName: 'Wilson',
                role: Role.MODERATOR,
            },
        ];

        for (const testUser of testUsers) {
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            await prisma.user.upsert({
                where: { email: testUser.email },
                update: {},
                create: {
                    ...testUser,
                    password: hashedPassword,
                    isActive: true,
                },
            });
        }

        console.log('✅ Development test users created');
    }

    console.log('✅ Seeding completed successfully');
    console.log('Created users:');
    console.log('  Admin: admin@example.com / Admin123!');
    console.log('  User: user@example.com / User123!');
    console.log('  Moderator: moderator@example.com / Moderator123!');

    if (process.env['NODE_ENV'] === 'development') {
        console.log('  Test users: john.doe@example.com, jane.smith@example.com, bob.wilson@example.com / TestUser123!');
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });