'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <span className="sr-only">Toggle theme</span>
                <div className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-gray-100" />
            ) : (
                <Sun className="h-5 w-5 text-gray-900" />
            )}
        </button>
    );
}
