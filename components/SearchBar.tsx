'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import debounce from '@/lib/debounce';
import { buildSearchIndex, searchInventory } from '@/lib/search';
import { getInitialData } from '@/lib/localStorage';
import Link from 'next/link';
import { SearchResultsModal } from './SearchResultsModal';
import { showToast } from '@/lib/toast';

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [modalResults, setModalResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => {
    const data = getInitialData();
    return buildSearchIndex(data);
  }, []);

  useEffect(() => {
    // Extract all unique field keys from all items
    const data = getInitialData();
    const fieldSet = new Set<string>();
    data.items.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'id' && key !== 'categoryId') {
          fieldSet.add(key);
        }
      });
    });
    // Also add fields from category definitions
    data.fields.forEach(field => {
      fieldSet.add(field.key);
    });
    setAvailableFields(fieldSet);
    setAllCategories(data.categories);
    // Select all categories by default
    setSelectedCategories(data.categories.map(c => c.id));
  }, []);

  const search = useMemo(
    () =>
      debounce((q: string, activeFilters: Record<string, string>, categoryFilter: string[]) => {
        setIsLoading(true);
        const data = getInitialData();
        
        let filteredItems = [...data.items];
        
        // Apply category filter
        if (categoryFilter.length > 0 && categoryFilter.length < data.categories.length) {
          filteredItems = filteredItems.filter(item => categoryFilter.includes(item.categoryId));
        }
        
        // Apply field filters
        const hasActiveFilters = Object.keys(activeFilters).length > 0;
        
        if (hasActiveFilters) {
          filteredItems = filteredItems.filter(item => {
            return Object.entries(activeFilters).every(([field, value]) => {
              const filterValue = value.trim().toLowerCase();
              if (!filterValue) return true;
              
              const itemValue = item[field];
              if (itemValue === undefined || itemValue === null) return false;
              
              return String(itemValue).toLowerCase().includes(filterValue);
            });
          });
        }
        
        // Apply text search - EXACT MATCH ONLY
        if (q.trim()) {
          const searchQuery = q.trim().toLowerCase();
          
          // Only exact string matching
          const exactMatches = filteredItems.filter(item => {
            return Object.entries(item).some(([key, value]) => {
              if (key === 'id' || key === 'categoryId') return false;
              return String(value || '').toLowerCase().includes(searchQuery);
            });
          });
          
          setResults(exactMatches.slice(0, 50));
        } else if (hasActiveFilters || (categoryFilter.length > 0 && categoryFilter.length < data.categories.length)) {
          // If only filters or category filter, show filtered items directly
          setResults(filteredItems.slice(0, 50));
        } else {
          // No search and no filters, show empty
          setResults([]);
        }
        
        setIsLoading(false);
      }, 200),
    [index]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
      // Don't load results immediately, wait for user action
    } else {
      setQuery('');
      setResults([]);
      setFilters({});
      setShowFilters(false);
      document.body.style.overflow = '';
      const data = getInitialData();
      setSelectedCategories(data.categories.map(c => c.id));
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val, filters, selectedCategories);
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters };
    if (value.trim()) {
      newFilters[field] = value;
    } else {
      delete newFilters[field];
    }
    setFilters(newFilters);
    
    // Trigger search immediately with updated filters
    setTimeout(() => {
      search(query, newFilters, selectedCategories);
    }, 0);
  };

  const removeFilter = (field: string) => {
    const newFilters = { ...filters };
    delete newFilters[field];
    setFilters(newFilters);
    search(query, newFilters, selectedCategories);
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    setSelectedCategories(newSelected);
    search(query, filters, newSelected);
  };

  const selectAllCategories = () => {
    const allIds = allCategories.map(c => c.id);
    setSelectedCategories(allIds);
    search(query, filters, allIds);
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
    search(query, filters, []);
  };

  const getCategoryName = (categoryId: string) => {
    const data = getInitialData();
    const cat = data.categories.find(c => c.id === categoryId);
    return cat?.name || 'Categoria';
  };

  const getFieldLabel = (fieldKey: string) => {
    const data = getInitialData();
    const field = data.fields.find(f => f.key === fieldKey);
    return field?.name || fieldKey;
  };

  if (!open && !showGroupedView) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 group"
      >
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-gray-600 dark:text-gray-400">Buscar...</span>
        <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <>
    {open && !showGroupedView && (() => {
      console.log('Modal de busca aberto', {open, showGroupedView});
      return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50 animate-fade-in"
         onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-slide-in"
           onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              className="flex-1 bg-transparent outline-none text-lg placeholder-gray-400"
              placeholder="Buscar equipamentos, patrimônio, setores..."
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters || Object.keys(filters).length > 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {Object.keys(filters).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {Object.keys(filters).length}
                </span>
              )}
            </button>
            {isLoading && (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Active Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(filters).map(([field, value]) => (
                <div
                  key={field}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  <span className="font-medium">{getFieldLabel(field)}:</span>
                  <span>{value}</span>
                  <button
                    onClick={() => removeFilter(field)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setFilters({});
                  search(query, {}, selectedCategories);
                }}
                className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
              >
                Limpar tudo
              </button>
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
              {/* Search Button */}
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Botão Buscar Geral clicado');
                    
                    // Force search with current filters
                    const data = getInitialData();
                    let filteredItems = [...data.items];
                    
                    console.log('Total de itens:', filteredItems.length);
                    
                    // Apply category filter
                    if (selectedCategories.length > 0 && selectedCategories.length < data.categories.length) {
                      filteredItems = filteredItems.filter(item => selectedCategories.includes(item.categoryId));
                      console.log('Após filtro de categoria:', filteredItems.length);
                    }
                    
                    // Apply field filters
                    if (Object.keys(filters).length > 0) {
                      console.log('Aplicando filtros:', filters);
                      filteredItems = filteredItems.filter(item => {
                        return Object.entries(filters).every(([field, value]) => {
                          const filterValue = value.trim().toLowerCase();
                          if (!filterValue) return true;
                          const itemValue = item[field];
                          if (itemValue === undefined || itemValue === null) return false;
                          return String(itemValue).toLowerCase().includes(filterValue);
                        });
                      });
                      console.log('Após filtros de campo:', filteredItems.length);
                    }
                    
                    // Apply text search if any - EXACT MATCH ONLY
                    if (query.trim()) {
                      console.log('Busca por texto:', query);
                      const searchQuery = query.trim().toLowerCase();
                      filteredItems = filteredItems.filter(item => {
                        return Object.entries(item).some(([key, value]) => {
                          if (key === 'id' || key === 'categoryId') return false;
                          return String(value || '').toLowerCase().includes(searchQuery);
                        });
                      });
                      console.log('Após busca de texto:', filteredItems.length);
                    }
                    
                    if (filteredItems.length === 0) {
                      showToast.info('Nenhum resultado encontrado com os filtros aplicados', { autoClose: 2500 });
                      return;
                    }
                    
                    console.log('Abrindo resultados com', filteredItems.length, 'itens');
                    
                    // Open modal with results
                    setModalResults(filteredItems);
                    setShowGroupedView(true);
                    setOpen(false);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar Geral (Tela Cheia)
                </button>
              </div>

              {/* Category Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Categorias</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllCategories}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Todas
                    </button>
                    <button
                      onClick={deselectAllCategories}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Nenhuma
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Filters */}
              <div>
                  <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Filtrar por Campo</h4>
                  <span className="text-xs text-gray-500">{availableFields.size} campos disponíveis</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-auto">
                  {Array.from(availableFields).sort().map(field => (
                    <div key={field}>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        {getFieldLabel(field)}
                      </label>
                      <input
                        type="text"
                        value={filters[field] || ''}
                        onChange={(e) => handleFilterChange(field, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            search(query, filters, selectedCategories);
                          }
                        }}
                        placeholder={`Filtrar por ${getFieldLabel(field)}`}
                        className={`w-full px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          filters[field] 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-auto">
          {!query && Object.keys(filters).length === 0 && selectedCategories.length === allCategories.length && results.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Digite para buscar ou use filtros para encontrar equipamentos específicos
              </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Dica: Combine busca de texto com filtros de campo para resultados precisos
              </p>
            </div>
          )}
          
          {results.length === 0 && (query || Object.keys(filters).length > 0 || selectedCategories.length < allCategories.length) && !isLoading && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tente ajustar sua busca ou filtros</p>
            </div>
          )}

          {results.length > 0 && groupByCategory ? (
            // Group by category
            (() => {
              const grouped = results.reduce((acc, item) => {
                const catId = item.categoryId;
                if (!acc[catId]) acc[catId] = [];
                acc[catId].push(item);
                return acc;
              }, {} as Record<string, any[]>);

              return Object.entries(grouped).map(([categoryId, categoryItems]) => (
                <div key={categoryId}>
                  <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{getCategoryName(categoryId)}</span>
                      <span className="text-xs text-gray-500">{(categoryItems as any[]).length} item(ns)</span>
                    </div>
                  </div>
                  {(categoryItems as any[]).map((item: any, index: number) => {
                    const displayFields = Object.entries(item)
                      .filter(([key]) => key !== 'id' && key !== 'categoryId')
                      .slice(0, 3);
                    
                    return (
                      <Link
                        key={item.id}
                        href={`/categories/${item.categoryId}?item=${item.id}`}
                        onClick={() => setOpen(false)}
                        className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate mb-1">{item.name || item.hostname || item.id}</div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {displayFields.map(([key, value]) => (
                                <span key={key} className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">{getFieldLabel(key)}:</span> {String(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ));
            })()
          ) : results.length > 0 ? (
            // Flat list
            results.map((item, index) => {
              const displayFields = Object.entries(item)
                .filter(([key]) => key !== 'id' && key !== 'categoryId')
                .slice(0, 3);
              
              return (
                <Link
                  key={item.id}
                  href={`/categories/${item.categoryId}?item=${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{item.name || item.hostname || item.id}</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                          {getCategoryName(item.categoryId)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {displayFields.map(([key, value]) => (
                          <span key={key} className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{getFieldLabel(key)}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })
          ) : null}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{results.length}</span>
              <span>resultado(s)</span>
              {selectedCategories.length < allCategories.length && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  {selectedCategories.length} categoria(s)
                </span>
              )}
              {Object.keys(filters).length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  {Object.keys(filters).length} filtro(s)
                </span>
              )}
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  groupByCategory 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title={groupByCategory ? 'Clique em "Buscar Geral" no filtro para ver tela cheia' : 'Ativar modo agrupado'}
              >
                <span className="text-base">{groupByCategory ? 'Agrupado' : 'Lista'}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">ESC</kbd>
              <span>para fechar</span>
            </div>
          </div>
        )}
      </div>
    </div>
      );
    })()}

      {/* Search Results Modal */}
      <SearchResultsModal
        isOpen={showGroupedView}
        onClose={() => setShowGroupedView(false)}
        results={modalResults}
        query={query}
      />
    </>
  );
}
