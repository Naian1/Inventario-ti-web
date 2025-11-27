"use client";
import { useState } from 'react';
import Link from 'next/link';
import { CategoryManager } from './CategoryManager';

export default function QuickActionsFloating() {
  const [open, setOpen] = useState(false);
  const [openNewCategory, setOpenNewCategory] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-[20000]">
      <div className="relative">
        {open && (
          <div className="mb-3 flex flex-col items-end space-y-2">
            <button
              onClick={() => {
                setOpen(false);
                setOpenNewCategory(true);
              }}
              className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-sm border border-gray-200 dark:border-gray-700 text-left"
            >
              Nova Categoria
            </button>
            <Link href="/categories" className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-sm border border-gray-200 dark:border-gray-700">
              Novo Item
            </Link>
            <Link href="/painel" className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-sm border border-gray-200 dark:border-gray-700">
              Relatórios
            </Link>
          </div>
        )}

        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Ações Rápidas"
          className="w-14 h-14 rounded-full bg-slate-800 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {openNewCategory && (
          <CategoryManager onClose={() => setOpenNewCategory(false)} onSuccess={() => setOpenNewCategory(false)} />
        )}
      </div>
    </div>
  );
}
