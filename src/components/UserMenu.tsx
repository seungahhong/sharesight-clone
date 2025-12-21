'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';
import Image from 'next/image';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function UserMenu() {
    const { data: session } = useSession();

    if (!session) {
        return (
            <button
                onClick={() => signIn('google')}
                className="ml-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
                Google Login
            </button>
        );
    }

    return (
        <Menu as="div" className="relative ml-4">
            <div>
                <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:focus:ring-offset-gray-800">
                    <span className="sr-only">Open user menu</span>
                    {session.user?.image ? (
                        <Image
                            className="h-8 w-8 rounded-full"
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            width={32}
                            height={32}
                        />
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                    )}
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {session.user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {session.user?.email}
                        </p>
                    </div>
                    <Menu.Item>
                        {({ active }) => (
                            <button
                                onClick={() => signOut()}
                                className={classNames(
                                    active ? 'bg-gray-100 dark:bg-gray-600' : '',
                                    'flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                                )}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                            </button>
                        )}
                    </Menu.Item>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
