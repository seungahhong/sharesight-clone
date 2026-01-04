'use server';

import { auth } from '@/auth';
import { supabase } from "@/lib/supabase";
import { revalidatePath } from 'next/cache';

/**
 * Get all holdings for the authenticated user
 */
export async function getUserHoldings() {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        // 1. Get User ID (using email to be safe, though session.user.id might work if PrismaAdapter is active)
        const { data: userData, error: userError } = await supabase
            .from('User')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (userError || !userData) {
            console.error('Error finding user:', userError);
            return { success: false, message: 'User not found' };
        }

        const userId = userData.id;

        // 2. Get Portfolio
        const { data: portfolioData, error: portfolioError } = await supabase
            .from('Portfolio')
            .select('id')
            .eq('userId', userId)
            .single();

        let portfolioId;

        if (!portfolioData) {
            // Create portfolio if not exists
            const { data: newPortfolio, error: createError } = await supabase
                .from('Portfolio')
                .insert({
                    id: crypto.randomUUID(),
                    name: 'My Portfolio',
                    userId: userId,
                    updatedAt: new Date().toISOString()
                })
                .select('id')
                .single();

            if (createError || !newPortfolio) {
                console.error('Error creating portfolio:', createError);
                return { success: false, message: 'Failed to create portfolio' };
            }
            portfolioId = newPortfolio.id;
        } else {
            portfolioId = portfolioData.id;
        }

        // 3. Get Holdings
        const { data: holdings, error: holdingsError } = await supabase
            .from('Holding')
            .select('*')
            .eq('portfolioId', portfolioId);

        if (holdingsError) {
            console.error('Error fetching holdings:', holdingsError);
            return { success: false, message: 'Failed to fetch holdings' };
        }

        return { success: true, holdings };
    } catch (error) {
        console.error('Error in getUserHoldings:', error);
        return { success: false, message: 'Internal Server Error' };
    }
}

/**
 * Add a holding for the authenticated user
 */
export async function addHolding(stock: { code: string; name: string }) {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const { data: userData } = await supabase
            .from('User')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!userData) return { success: false, message: 'User not found' };

        // Get or Create Portfolio
        let { data: portfolioData } = await supabase
            .from('Portfolio')
            .select('id')
            .eq('userId', userData.id)
            .single();

        if (!portfolioData) {
            const { data: newPortfolio } = await supabase
                .from('Portfolio')
                .insert({
                    id: crypto.randomUUID(),
                    name: 'My Portfolio',
                    userId: userData.id,
                    updatedAt: new Date().toISOString()
                })
                .select('id')
                .single();
            if (newPortfolio) portfolioData = newPortfolio;
        }

        if (!portfolioData) return { success: false, message: 'Portfolio error' };

        // Check if holding exists
        const { data: existing } = await supabase
            .from('Holding')
            .select('id')
            .eq('portfolioId', portfolioData.id)
            .eq('symbol', stock.code)
            .single();

        if (existing) {
            return { success: false, message: 'Holding already exists' };
        }

        // Create Holding
        const { error } = await supabase
            .from('Holding')
            .insert({
                id: crypto.randomUUID(),
                portfolioId: portfolioData.id,
                symbol: stock.code,
                name: stock.name,
                quantity: 1,
                buyPrice: 0,
                buyDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

        if (error) {
            console.error("Supabase insert error:", error);
            return { success: false, message: 'Failed to add holding' };
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error in addHolding:', error);
        return { success: false, message: 'Internal Server Error' };
    }
}

/**
 * Remove a holding for the authenticated user
 */
export async function removeHolding(symbol: string) {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const { data: userData } = await supabase
            .from('User')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!userData) return { success: false, message: 'User not found' };

        const { data: portfolioData } = await supabase
            .from('Portfolio')
            .select('id')
            .eq('userId', userData.id)
            .single();

        if (!portfolioData) return { success: false, message: 'Portfolio not found' };

        const { error } = await supabase
            .from('Holding')
            .delete()
            .eq('portfolioId', portfolioData.id)
            .eq('symbol', symbol);

        if (error) {
            console.error("Supabase delete error:", error);
            return { success: false, message: 'Failed to remove holding' };
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error in removeHolding:', error);
        return { success: false, message: 'Internal Server Error' };
    }
}
