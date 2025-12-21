'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface LocalStock {
    code: string;
    name: string;
}

export async function migrateLocalData(localStocksKR: LocalStock[], localStocksUS: LocalStock[]) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" };
    }

    const userId = session.user.id;

    try {
        // 1. Get or create the default portfolio for the user
        let portfolio = await prisma.portfolio.findFirst({
            where: { userId },
        });

        if (!portfolio) {
            portfolio = await prisma.portfolio.create({
                data: {
                    name: "My Portfolio",
                    userId,
                },
            });
        }

        // 2. Add KR stocks
        for (const stock of localStocksKR) {
            // Check if holding already exists to avoid duplicates
            const existing = await prisma.holding.findFirst({
                where: {
                    portfolioId: portfolio.id,
                    symbol: stock.code, // Assuming symbol stores the code
                },
            });

            if (!existing) {
                await prisma.holding.create({
                    data: {
                        portfolioId: portfolio.id,
                        symbol: stock.code,
                        name: stock.name,
                        quantity: 1, // Default quantity
                        buyPrice: 0, // Default price
                        buyDate: new Date(),
                    },
                });
            }
        }

        // 3. Add US stocks
        for (const stock of localStocksUS) {
            const existing = await prisma.holding.findFirst({
                where: {
                    portfolioId: portfolio.id,
                    symbol: stock.code,
                },
            });

            if (!existing) {
                await prisma.holding.create({
                    data: {
                        portfolioId: portfolio.id,
                        symbol: stock.code,
                        name: stock.name,
                        quantity: 1, // Default quantity
                        buyPrice: 0, // Default price
                        buyDate: new Date(),
                    },
                });
            }
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Migration error:", error);
        return { success: false, message: "Migration failed" };
    }
}
