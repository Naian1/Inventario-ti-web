'use client';
import React, { PropsWithChildren, useState, useEffect } from 'react';
// layout no longer defines nav items; Sidebar component handles navigation
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import Sidebar from './Sidebar';
import { isAdmin } from '@/lib/localStorage';
import QuickActionsFloating from './QuickActionsFloating';

export default function Layout({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLarge, setIsLarge] = useState(true);
  useEffect(() => {
    setIsAdminUser(isAdmin());
  }, []);

  // Ensure sidebar is closed by default on small screens and opened on large screens
  useEffect(() => {
    const applyInitial = () => {
      try {
        const large = window.innerWidth >= 1024; // lg breakpoint
        setIsLarge(large);
        // keep sidebar visible on small screens only when toggled
        setSidebarOpen(!large);
      } catch (e) {
        // ignore during SSR
      }
    };

    applyInitial();
    const onResize = () => applyInitial();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sidebar component handles nav items and active state

  return (
    <div className="app-shell">
      {/* Sidebar (new component) */}
      {(isLarge || sidebarOpen) && <Sidebar isAdmin={isAdminUser} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <SearchBar />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 Inventário TI - Sistema de Gestão de Equipamentos</p>
        </footer>
      </div>
      <QuickActionsFloating />
    </div>
  );
}
