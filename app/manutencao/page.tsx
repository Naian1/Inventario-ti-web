"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getInitialData } from '@/lib/localStorage';
import type { Item, Category } from '@/lib/types';
import Link from 'next/link';

export default function ManutencaoPage() {
  const [maintenanceItems, setMaintenanceItems] = useState<Array<Item & { categoryName: string; categoryId: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<Array<Item & { categoryName: string; categoryId: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadMaintenanceItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceItems, searchTerm, selectedCategory]);

  const loadMaintenanceItems = () => {
    const data = getInitialData();
    const items: Array<Item & { categoryName: string; categoryId: string; originalCategory?: string }> = [];

    // Buscar itens na categoria MAINTENANCE_CATEGORY ou com status 'maintenance'
    data.items.forEach(item => {
      if (item.categoryId === 'MAINTENANCE_CATEGORY' || item.status === 'maintenance') {
        // Buscar categoria original no histórico de movimentações
        const movements = data.movementHistory?.filter(m => m.itemId === item.id) || [];
        const lastMove = movements.find(m => m.reason === 'to_maintenance');
        const originalCategoryId = lastMove?.fromCategory;
        const originalCategory = data.categories.find(c => c.id === originalCategoryId);
        
        items.push({
          ...item,
          categoryName: 'Manutenção',
          categoryId: item.categoryId,
          originalCategory: originalCategory?.name || 'Categoria Desconhecida'
        });
      }
    });

    setMaintenanceItems(items);
    setCategories(data.categories.filter(c => c.id !== 'STOCK_CATEGORY' && c.id !== 'MAINTENANCE_CATEGORY'));
  };

  const applyFilters = () => {
    let filtered = [...maintenanceItems];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        Object.entries(item).some(([key, value]) => {
          if (key === 'id' || key === 'categoryName' || key === 'categoryId') return false;
          return String(value).toLowerCase().includes(term);
        })
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.categoryId === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const getDaysInMaintenance = (item: Item) => {
    const movements = getInitialData().movementHistory?.filter(m => 
      m.itemId === item.id && (m.reason === 'to_maintenance' || m.action === 'status_change')
    );
    
    if (!movements || movements.length === 0) return '-';
    
    const lastMovement = movements[0];
    const days = Math.floor((Date.now() - new Date(lastMovement.timestamp).getTime()) / (1000 * 60 * 60 * 24));
    return `${days} dias`;
  };

  const getPriorityColor = (days: string) => {
    if (days === '-') return 'text-gray-500';
    const numDays = parseInt(days);
    if (numDays > 30) return 'text-red-600 font-bold';
    if (numDays > 15) return 'text-amber-600 font-semibold';
    return 'text-gray-900 dark:text-white';
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Manutenção
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Equipamentos em reparo ou aguardando manutenção
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar em todos os campos..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-amber-600">{maintenanceItems.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total em Manutenção</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">
                  {maintenanceItems.filter(item => {
                    const days = getDaysInMaintenance(item);
                    return days !== '-' && parseInt(days) > 30;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mais de 30 dias</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">
                  {maintenanceItems.filter(item => {
                    const days = getDaysInMaintenance(item);
                    return days !== '-' && parseInt(days) > 15 && parseInt(days) <= 30;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">15-30 dias</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-600">
                  {maintenanceItems.filter(item => {
                    const days = getDaysInMaintenance(item);
                    return days !== '-' && parseInt(days) <= 15;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Menos de 15 dias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Itens - Tabela Dinâmica */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Nenhum item encontrado com os filtros aplicados' 
                  : 'Nenhum equipamento em manutenção no momento'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Categoria Original
                    </th>
                    {/* Colunas dinâmicas - todos os campos de todos os items */}
                    {Array.from(new Set(filteredItems.flatMap(item => 
                      Object.keys(item).filter(key => !['id', 'categoryName', 'categoryId', 'status', 'originalCategory'].includes(key))
                    ))).map(field => (
                      <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {field}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tempo em Manutenção
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => {
                    const daysStr = getDaysInMaintenance(item);
                    const days = daysStr !== '-' ? parseInt(daysStr) : 0;
                    const allFields = Array.from(new Set(filteredItems.flatMap(i => 
                      Object.keys(i).filter(key => !['id', 'categoryName', 'categoryId', 'status', 'originalCategory'].includes(key))
                    )));
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Manutenção</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {item.originalCategory || 'Desconhecida'}
                          </span>
                        </td>
                        {allFields.map(field => (
                          <td key={field} className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {item[field] || '-'}
                          </td>
                        ))}
                        <td className={`px-6 py-4 text-sm font-semibold ${getPriorityColor(daysStr)}`}>
                          {daysStr}
                        </td>
                        <td className="px-6 py-4">
                          {days > 30 && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse">
                              URGENTE
                            </span>
                          )}
                          {days > 15 && days <= 30 && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              ATENÇÃO
                            </span>
                          )}
                          {days <= 15 && days > 0 && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/categories/MAINTENANCE_CATEGORY`}
                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                          >
                            Ver Detalhes
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
