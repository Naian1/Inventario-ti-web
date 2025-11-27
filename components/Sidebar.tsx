"use client";
import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import { UserSwitcher } from './UserSwitcher';

type NavItem = { href: string; label: string; adminOnly?: boolean; icon?: React.ReactNode };

const navItems: NavItem[] = [
  { href: '/painel', label: 'Painel', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" fill="currentColor"/></svg>
  )},
  { href: '/dashboard', label: 'Dashboard', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" fill="currentColor" opacity="0.9"/></svg>
  )},
  { href: '/categories', label: 'Minhas Categorias', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/></svg>
  )},
  { href: '/manage-categories', label: 'Gerenciar Categorias', adminOnly: true, icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" fill="currentColor"/></svg>
  )},
  { href: '/reports', label: 'Relatórios', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v2H3V3zm2 16h14v2H5v-2zm0-8h10v6H5v-6z" fill="currentColor"/></svg>
  )},
];

export default function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <aside className="sidebar-new fixed left-0 top-0 h-full z-50">
      <div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-5 flex flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <img src="/favicon-32x32.png" alt="logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Inventário TI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Gestão</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                <span className="w-9 h-9 flex items-center justify-center text-xl text-gray-400 group-hover:text-blue-600">{item.icon}</span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.adminOnly && <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">Admin</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="panel p-4 mb-4 rounded-lg border border-gray-100 bg-gray-50">
            <p className="text-sm font-medium">Dica</p>
            <p className="text-xs text-gray-600">Use Ctrl+K para buscar rapidamente</p>
          </div>

          <UserSwitcher />
        </div>
      </div>

      {/* Collapsed variant for small screens or compact mode */}
      <div className="sidebar-collapsed fixed left-0 top-0 h-full w-20 p-3 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 hidden">
        <div className="flex flex-col items-center gap-4 mt-6">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50">
              {item.icon}
            </Link>
          ))}
        </div>

        <div className="mt-auto mb-6 flex items-center justify-center">
          <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-semibold">A</div>
        </div>
      </div>
    </aside>
  );
}
