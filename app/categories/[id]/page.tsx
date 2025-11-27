'use client';
import { useEffect, useState, useMemo } from 'react';
import { getInitialData, saveData, getDuplicateConfig } from '@/lib/localStorage';
import type { Category, Item, Field } from '@/lib/types';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { nanoid } from 'nanoid';
import { showToast } from '@/lib/toast';

export default function CategoryPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = () => {
    const data = getInitialData();
    const cat = data.categories.find((c) => c.id === params.id);
    if (cat) {
      setCategory(cat);
      const categoryItems = data.items.filter((i) => i.categoryId === params.id);
      setItems(categoryItems);
      
      // Get fields from category definition
      const categoryFields = data.fields.filter((f) => f.categoryId === params.id);
      if (categoryFields.length > 0) {
        setFields(categoryFields);
      } else {
        // Fallback: Extract unique field keys from items
        const fieldSet = new Set<string>();
        categoryItems.forEach((item) => {
          Object.keys(item).forEach((key) => {
            if (key !== 'id' && key !== 'categoryId') {
              fieldSet.add(key);
            }
          });
        });
        setFields(Array.from(fieldSet).map(key => ({ 
          id: key, 
          categoryId: params.id, 
          key, 
          name: key, 
          type: 'string' as const 
        })));
      }
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply column filters
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter(item => {
        return Object.entries(columnFilters).every(([field, filterValue]) => {
          if (!filterValue.trim()) return true;
          const itemValue = String(item[field] || '').toLowerCase();
          return itemValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '').toLowerCase();
        const bVal = String(b[sortConfig.key] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, columnFilters, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleColumnFilter = (field: string, value: string) => {
    setColumnFilters(prev => {
      if (!value.trim()) {
        const newFilters = { ...prev };
        delete newFilters[field];
        return newFilters;
      }
      return { ...prev, [field]: value };
    });
  };

  const saveItem = async () => {
    if (!editingItem) return;
    
    const data = getInitialData();
    const itemIndex = data.items.findIndex((i) => i.id === editingItem.id);
    if (itemIndex !== -1) {
      data.items[itemIndex] = editingItem;
      saveData(data);
      setEditingItem(null);
      loadData();
      showToast.success('Item atualizado com sucesso!', { autoClose: 2000 });
      try {
        const { addActivity } = await import('@/lib/localStorage');
        addActivity({ type: 'update', title: 'Item atualizado', description: `Item ${editingItem.id} atualizado na categoria ${params.id}` });
      } catch (e) {}
    }
  };

  const deleteItem = (itemId: string) => {
    if (!confirm('🗑️ Tem certeza que deseja excluir este item?\n\nEsta ação não pode ser desfeita.')) return;
    
    const data = getInitialData();
    data.items = data.items.filter((i) => i.id !== itemId);
    saveData(data);
    loadData();
    showToast.success('Item excluído com sucesso!', { autoClose: 2000 });
  };

  const openAddItemModal = () => {
    const initialItem: Record<string, any> = {};
    fields.forEach(field => {
      initialItem[field.key] = '';
    });
    setNewItem(initialItem);
    setAddingItem(true);
  };

  const addNewItem = () => {
    const data = getInitialData();
    const item: Item = {
      id: nanoid(),
      categoryId: params.id,
      ...newItem
    };

    // Duplicate check based on configured fields
    const dupCfg = getDuplicateConfig();
    const dupFields = dupCfg && dupCfg.fields ? dupCfg.fields : [];
    function normalizeValue(v: any) {
      if (v === null || v === undefined) return '';
      return String(v).trim().toLowerCase();
    }

    let skipAdd = false;
    if (dupFields && dupFields.length > 0) {
      console.log('🔍 Verificando duplicados ao adicionar item:');
      console.log('  - Campos configurados:', dupFields);
      console.log('  - Item sendo adicionado:', item);
      console.log('  - Total de items no inventário:', data.items.length);
      
      // Nova abordagem: verificar CADA campo individualmente
      const duplicatesByField: Array<{ field: string; value: string; matches: any[] }> = [];
      
      dupFields.forEach(field => {
        const newValue = item[field];
        if (newValue !== undefined && newValue !== null) {
          const normalized = normalizeValue(newValue);
          if (normalized.length > 0) {
            console.log(`  - Verificando campo "${field}" com valor "${newValue}" (normalizado: "${normalized}")`);
            
            const matches = data.items.filter(existingItem => {
              const existingValue = existingItem[field];
              if (existingValue === undefined || existingValue === null) return false;
              const existingNormalized = normalizeValue(existingValue);
              const isMatch = existingNormalized === normalized;
              if (isMatch) {
                console.log(`    ✅ Match encontrado! Item ${existingItem.id} tem ${field}="${existingValue}"`);
              }
              return isMatch;
            });
            
            if (matches.length > 0) {
              console.log(`  ⚠️ Campo "${field}" duplicado! ${matches.length} item(ns) encontrado(s)`);
              duplicatesByField.push({ field, value: String(newValue), matches });
            } else {
              console.log(`  ✓ Campo "${field}" único (sem duplicados)`);
            }
          }
        }
      });
      
      if (duplicatesByField.length > 0) {
        console.log(`  ⚠️ Total de campos duplicados: ${duplicatesByField.length}`);
        
        let warningMsg = `⚠️ ATENÇÃO: POSSÍVEL DUPLICADO ENCONTRADO!\n\n`;
        warningMsg += `Foram encontrados ${duplicatesByField.length} campo(s) com valores duplicados:\n\n`;
        
        duplicatesByField.forEach(dup => {
          warningMsg += `📌 Campo "${dup.field}" = "${dup.value}"\n`;
          warningMsg += `   ${dup.matches.length} item(ns) já existente(s):\n\n`;
          dup.matches.forEach((m, idx) => {
            const cat = data.categories.find(c => c.id === m.categoryId);
            const catName = cat ? cat.name : 'Desconhecida';
            warningMsg += `   ${idx + 1}. Categoria: ${catName}\n`;
            warningMsg += `      ID: ${m.id}\n`;
            // Mostrar outros campos importantes do item duplicado
            const importantFields = ['hostname', 'ip', 'patrimonio', 'setor', 'local'];
            importantFields.forEach(f => {
              if (m[f] && m[f] !== dup.value) {
                warningMsg += `      ${f}: ${m[f]}\n`;
              }
            });
            warningMsg += `\n`;
          });
        });
        
        warningMsg += `\nDeseja adicionar este item mesmo assim?`;
        
        console.log('  📢 Mostrando alerta ao usuário...');
        const go = typeof window !== 'undefined' ? window.confirm(warningMsg) : true;
        
        if (!go) {
          console.log('  ❌ Usuário cancelou adição');
          skipAdd = true;
          showToast.warning('Item não foi adicionado', { autoClose: 2500 });
        } else {
          console.log('  ✅ Usuário confirmou adição apesar dos duplicados');
          showToast.info('Item adicionado mesmo com duplicados detectados', { autoClose: 3000 });
        }
      } else {
        console.log('  ✓ Nenhum campo duplicado encontrado - item único!');
      }
    } else {
      console.log('  ℹ️ Nenhum campo configurado para detecção de duplicados');
    }

    if (skipAdd) {
      // user cancelled adding due to duplicate
      return;
    }

    data.items.push(item);
    saveData(data);
    setAddingItem(false);
    setNewItem({});
    loadData();
    showToast.success('Item adicionado com sucesso!', { autoClose: 2000 });
  };

  if (!category) {
    return (
      <Layout>
        <div className="content">
          <div className="panel">
            <h2 className="text-xl font-semibold mb-4">Categoria não encontrada</h2>
            <Link href="/painel" className="text-blue-600 hover:underline">
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="content">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'itens'}
              {filteredAndSortedItems.length !== items.length && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (filtrado de {items.length})
                </span>
              )}
            </p>
          </div>
          <Link
            href="/painel"
            className="btn btn-ghost"
          >
            ← Voltar
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="panel text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nenhum item nesta categoria ainda
            </p>
            <button onClick={openAddItemModal} className="btn btn-primary">
              + Adicionar Item
            </button>
          </div>
        ) : (
          <div className="panel">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {Object.keys(columnFilters).length > 0 && (
                  <button
                    onClick={() => setColumnFilters({})}
                    className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    🗑️ Limpar Filtros
                  </button>
                )}
                {sortConfig && (
                  <button
                    onClick={() => setSortConfig(null)}
                    className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    ↕️ Remover Ordenação
                  </button>
                )}
              </div>
              <button onClick={openAddItemModal} className="btn btn-primary">
                + Adicionar Item
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {fields.map((field) => (
                      <th key={field.key} className="relative group">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSort(field.key)}
                            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span>{field.name}</span>
                            {sortConfig?.key === field.key && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                            {!sortConfig || sortConfig.key !== field.key && (
                              <span className="opacity-0 group-hover:opacity-50 text-xs">↕️</span>
                            )}
                          </button>
                          <input
                            type="text"
                            value={columnFilters[field.key] || ''}
                            onChange={(e) => handleColumnFilter(field.key, e.target.value)}
                            placeholder={`Filtrar ${field.name}...`}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                    ))}
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={fields.length + 1} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {Object.keys(columnFilters).length > 0 ? (
                          <>Nenhum item encontrado com os filtros aplicados</>
                        ) : (
                          <>Nenhum item nesta categoria</>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedItems.map((item) => (
                      <tr key={item.id}>
                        {fields.map((field) => (
                          <td key={field.key}>{item[field.key] || '-'}</td>
                        ))}
                        <td>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-bold">Editar Item</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.name}</label>
                    <input
                      type="text"
                      value={editingItem[field.key] || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                <button onClick={() => setEditingItem(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button onClick={saveItem} className="btn btn-primary">
                  ✓ Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {addingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-bold">➕ Adicionar Novo Item</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.name}</label>
                    <input
                      type="text"
                      value={newItem[field.key] || ''}
                      onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setAddingItem(false); setNewItem({}); }} className="btn btn-ghost">
                  Cancelar
                </button>
                <button onClick={addNewItem} className="btn btn-primary">
                  ✓ Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
