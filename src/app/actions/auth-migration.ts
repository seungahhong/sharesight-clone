'use server';

import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

interface LocalStock {
    code: string;
    name: string;
}

export async function migrateLocalData(localStocksKR: LocalStock[], localStocksUS: LocalStock[]) {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        // 1. Get User ID
        const { data: userData, error: userError } = await supabase
            .from('User')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (userError || !userData) {
            console.error('Error finding user for migration:', userError);
            return { success: false, message: 'User not found' };
        }

        const userId = userData.id;

        // 2. Get or Create Portfolio
        let { data: portfolioData } = await supabase
            .from('Portfolio')
            .select('id')
            .eq('userId', userId)
            .single();

        if (!portfolioData) {
            const { data: newPortfolio, error: createError } = await supabase
                .from('Portfolio')
                .insert({ name: 'My Portfolio', userId: userId, updatedAt: new Date().toISOString() })
                .select('id')
                .single();

            if (createError) {
                console.error('Error creating portfolio during migration:', createError);
                return { success: false, message: 'Failed to create portfolio' };
            }
            portfolioData = newPortfolio;
        }

        if (!portfolioData) return { success: false, message: 'Portfolio error' };

        const portfolioId = portfolioData.id;

        // Helper to add stocks
        const addStocks = async (stocks: LocalStock[]) => {
            for (const stock of stocks) {
                // Check exist
                const { data: existing } = await supabase
                    .from('Holding')
                    .select('id')
                    .eq('portfolioId', portfolioId)
                    .eq('symbol', stock.code)
                    .single();

                if (!existing) {
                    await supabase
                        .from('Holding')
                        .insert({
                            portfolioId,
                            symbol: stock.code,
                            name: stock.name,
                            quantity: 1,
                            buyPrice: 0,
                            buyDate: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                }
            }
        };

        // 3. Add KR stocks
        await addStocks(localStocksKR);

        // 4. Add US stocks
        await addStocks(localStocksUS);

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Migration error:", error);
        return { success: false, message: "Migration failed" };
    }
}
