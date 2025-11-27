'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getInitialData } from '@/lib/localStorage';
import type { Category, Item } from '@/lib/types';
import Link from 'next/link';
import { InlineImport } from '@/components/InlineImport';
import { StatsCard, CategoryDistribution, RecentActivity, DuplicateMonitor } from '@/components/DashboardWidgets';
import DuplicateConfigPanel from '@/components/DuplicateConfigPanel';
import DuplicateWarnings from '@/components/DuplicateWarnings';

export default function DashboardPage() {
  const [data, setData] = useState<{
    categories: Category[];
    items: Item[];
    totalItems: number;
  }>({ categories: [], items: [], totalItems: 0 });

  const [stats, setStats] = useState({
    totalCategories: 0,
    totalItems: 0,
    recentlyAdded: 0,
  });

  const loadData = () => {
    const inventoryData = getInitialData();
    setData({
      categories: inventoryData.categories,
      items: inventoryData.items,
      totalItems: inventoryData.items.length,
    });

    setStats({
      totalCategories: inventoryData.categories.length,
      totalItems: inventoryData.items.length,
      recentlyAdded: 0,
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryCount = (categoryId: string) => {
    return data.items.filter((item) => item.categoryId === categoryId).length;
  };

  return (
    <Layout>
      <div className="content">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Painel
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visão geral do inventário de TI - Gestão completa de equipamentos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total de Itens"
            value={stats.totalItems}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2 3h10v9H3V7z" /></svg>}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            description={`${stats.totalItems} equipamentos cadastrados`}
          />
          <StatsCard
            title="Categorias"
            value={stats.totalCategories}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2 3h10v9H3V7z" /></svg>}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            description={`${stats.totalCategories} categorias ativas`}
          />
          <StatsCard
            title="Adicionados Hoje"
            value={stats.recentlyAdded}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4" /></svg>}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            description="Novos itens no sistema"
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Import Section */}
            <div className="panel">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Importar Dados</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Importe CSV ou XLSX com mapeamento inteligente
                  </p>
                </div>
              </div>
              <InlineImport />
            </div>

            {/* Category Distribution */}
            <CategoryDistribution />
              <div className="mt-6">
                <DuplicateConfigPanel />
                <div className="mt-4">
                  <DuplicateWarnings />
                </div>
              </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            <DuplicateMonitor />
            <RecentActivity />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Minhas Categorias</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.totalCategories > 0 
                ? 'Clique em uma categoria para ver os equipamentos' 
                : 'Nenhuma categoria criada ainda'}
            </p>
          </div>
        </div>

        {data.categories.length === 0 ? (
          <div className="panel text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">Nenhuma categoria ainda</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Categorias são como "abas" no Excel. Um administrador precisa criar categorias antes de adicionar equipamentos.
            </p>
            <Link
              href="/manage-categories"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ir para Gestão de Categorias
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.categories.map((category, index) => {
              const count = getCategoryCount(category.id);
              const gradients = [
                'from-blue-500 to-blue-600',
                'from-purple-500 to-purple-600',
                'from-pink-500 to-pink-600',
                'from-green-500 to-green-600',
                'from-yellow-500 to-yellow-600',
                'from-red-500 to-red-600',
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.id}`}
                  className="panel hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {category.name}
                      </h3>
                      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <span className="text-white font-bold text-lg">{count}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>{count} {count === 1 ? 'item' : 'itens'}</span>
                    </div>
                    
                    <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                      Ver detalhes
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </Layout>
  );
}
