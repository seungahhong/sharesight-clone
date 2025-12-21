'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUserHoldings() {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" };
    }

    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: { userId: session.user.id },
            include: { holdings: true },
        });

        if (!portfolio) {
            return { success: true, holdings: [] };
        }

        return { success: true, holdings: portfolio.holdings };
    } catch (error) {
        console.error("Error fetching holdings:", error);

        return { success: false, message: "Failed to fetch holdings" };
    }
}

export async function addHolding(stock: { code: string; name: string }) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" };
    }

    try {
        let portfolio = await prisma.portfolio.findFirst({
            where: { userId: session.user.id },
        });

        if (!portfolio) {
            portfolio = await prisma.portfolio.create({
                data: {
                    name: "My Portfolio",
                    userId: session.user.id,
                },
            });
        }

        const existing = await prisma.holding.findFirst({
            where: {
                portfolioId: portfolio.id,
                symbol: stock.code,
            },
        });

        if (existing) {
            return { success: false, message: "Already exists" };
        }

        await prisma.holding.create({
            data: {
                portfolioId: portfolio.id,
                symbol: stock.code,
                name: stock.name,
                quantity: 1,
                buyPrice: 0,
                buyDate: new Date(),
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error adding holding:", error);
        return { success: false, message: "Failed to add holding" };
    }
}

export async function removeHolding(stockCode: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" };
    }

    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: { userId: session.user.id },
        });

        if (!portfolio) {
            return { success: false, message: "Portfolio not found" };
        }

        await prisma.holding.deleteMany({
            where: {
                portfolioId: portfolio.id,
                symbol: stockCode,
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error removing holding:", error);
        return { success: false, message: "Failed to remove holding" };
    }
}
