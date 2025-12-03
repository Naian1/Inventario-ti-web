"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getInitialData } from '@/lib/localStorage';
import type { Item, Category } from '@/lib/types';
import Link from 'next/link';

export default function EstoquePage() {
  const [stockItems, setStockItems] = useState<Array<Item & { categoryName: string; categoryId: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<Array<Item & { categoryName: string; categoryId: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadStockItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [stockItems, searchTerm, selectedCategory]);

  const loadStockItems = () => {
    const data = getInitialData();
    const items: Array<Item & { categoryName: string; categoryId: string; originalCategory?: string }> = [];

    // Buscar itens na categoria STOCK_CATEGORY ou com status 'stock'
    data.items.forEach(item => {
      if (item.categoryId === 'STOCK_CATEGORY' || item.status === 'stock') {
        // Buscar categoria original no histórico de movimentações
        const movements = data.movementHistory?.filter(m => m.itemId === item.id) || [];
        const lastMove = movements.find(m => m.reason === 'to_stock');
        const originalCategoryId = lastMove?.fromCategory;
        const originalCategory = data.categories.find(c => c.id === originalCategoryId);
        
        items.push({
          ...item,
          categoryName: 'Estoque',
          categoryId: item.categoryId,
          originalCategory: originalCategory?.name || 'Categoria Desconhecida'
        });
      }
    });

    setStockItems(items);
    setCategories(data.categories.filter(c => c.id !== 'STOCK_CATEGORY' && c.id !== 'MAINTENANCE_CATEGORY'));
  };

  const applyFilters = () => {
    let filtered = [...stockItems];

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

  const getDaysInStock = (item: Item) => {
    const movements = getInitialData().movementHistory?.filter(m => 
      m.itemId === item.id && (m.reason === 'to_stock' || m.action === 'status_change')
    );
    
    if (!movements || movements.length === 0) return '-';
    
    const lastMovement = movements[0];
    const days = Math.floor((Date.now() - new Date(lastMovement.timestamp).getTime()) / (1000 * 60 * 60 * 24));
    return `${days} dias`;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Estoque
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Equipamentos armazenados e não em uso ativo
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-600">{stockItems.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total em Estoque</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{categories.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categorias</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-600">{filteredItems.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resultados Filtrados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Itens - Tabela Dinâmica */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Nenhum item encontrado com os filtros aplicados' 
                  : 'Nenhum equipamento em estoque no momento'}
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
                    {/* Colunas dinâmicas - pega todos os campos únicos de todos os items */}
                    {Array.from(new Set(filteredItems.flatMap(item => 
                      Object.keys(item).filter(key => !['id', 'categoryName', 'categoryId', 'status', 'originalCategory'].includes(key))
                    ))).map(field => (
                      <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {field}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tempo em Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => {
                    const allFields = Array.from(new Set(filteredItems.flatMap(i => 
                      Object.keys(i).filter(key => !['id', 'categoryName', 'categoryId', 'status', 'originalCategory'].includes(key))
                    )));
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Estoque</span>
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
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {getDaysInStock(item)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/categories/STOCK_CATEGORY`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
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
