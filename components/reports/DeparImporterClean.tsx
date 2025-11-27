"use client";
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { getInitialData } from '@/lib/localStorage';
import { showToast } from '@/lib/toast';

type Row = Record<string, string>;
type CategoryField = {
  categoryId: string;
  categoryName: string;
  fieldName: string;
  label: string;
};

function parseCSV(text: string, delimiter = ','): { headers: string[]; rows: Row[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    const row: Row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (cols[j] ?? '').trim();
    rows.push(row);
  }
  return { headers, rows };
}

export default function DeparImporter() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [vendorRows, setVendorRows] = useState<Row[]>([]);
  const [selectedSheetColumn, setSelectedSheetColumn] = useState<string>('');
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [selectedCategoryFields, setSelectedCategoryFields] = useState<CategoryField[]>([]);
  const [digitsOnly, setDigitsOnly] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<null | {
    matches: Array<{ value: string; sheetValue: string; item: any; categoryName: string; fieldName: string }>;
    onlyInSheet: Array<{ value: string; row: Row }>;
    onlyInInventory: Array<{ id: string; categoryId: string; categoryName: string; displayValue: string; fields: Record<string, string> }>;
  }>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    const data = getInitialData();
    const items = data.items || [];
    const categories = data.categories || [];
    
    console.log('📊 DEPARA Debug:', {
      totalCategories: categories.length,
      totalItems: items.length,
      categoriesNames: categories.map((c: any) => c.name)
    });
    
    setInventoryItems(items);
    
    const fieldsMap: CategoryField[] = [];
    const fieldSet = new Set<string>();
    
    categories.forEach((cat: any) => {
      const categoryItems = items.filter((item: any) => item.categoryId === cat.id);
      console.log(`  📁 Categoria "${cat.name}": ${categoryItems.length} itens`);
      
      categoryItems.forEach((item: any) => {
        // Os campos são propriedades diretas do item, não estão em item.fields
        const itemKeys = Object.keys(item).filter(k => k !== 'id' && k !== 'categoryId');
        console.log(`    - Item ${item.id}: campos [${itemKeys.join(', ')}]`);
        
        itemKeys.forEach(fieldName => {
          // Só adicionar se o valor não estiver vazio
          const value = item[fieldName];
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            const key = `${cat.id}__${fieldName}`;
            if (!fieldSet.has(key)) {
              fieldSet.add(key);
              fieldsMap.push({
                categoryId: cat.id,
                categoryName: cat.name,
                fieldName,
                label: `${cat.name} → ${fieldName}`
              });
            }
          }
        });
      });
    });
    
    console.log('✅ Campos detectados:', fieldsMap.length, fieldsMap);
    setCategoryFields(fieldsMap);
    
    const autoFields = fieldsMap.filter(f => 
      /patrimonio|patrimônio|numero|número|serie|série|ns|tag|placa|equipamento/i.test(f.fieldName)
    );
    console.log('🎯 Campos auto-selecionados:', autoFields.length, autoFields.map(f => f.label));
    
    if (autoFields.length > 0) {
      setSelectedCategoryFields(autoFields);
    }
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    let h: string[] = [];
    let rs: Row[] = [];

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const parsed = parseCSV(text);
      h = parsed.headers;
      rs = parsed.rows;
    } else if (file.name.endsWith('.xlsx')) {
      const XLSX = await import('xlsx');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws);
      if (json.length > 0) {
        h = Object.keys(json[0]);
        rs = json.map((r: any) => {
          const row: Row = {};
          h.forEach(k => { row[k] = String(r[k] ?? '').trim(); });
          return row;
        });
      }
    }

    setHeaders(h);
    setVendorRows(rs);
    
    if (h.length > 0) {
      const eqCol = h.find((col: string) => /equipamento|patrimonio|patrimônio/i.test(col));
      setSelectedSheetColumn(eqCol || h[0]);
    }
  };

  const toggleCategoryField = (cf: CategoryField) => {
    setSelectedCategoryFields(prev => {
      const exists = prev.some(p => p.categoryId === cf.categoryId && p.fieldName === cf.fieldName);
      if (exists) {
        return prev.filter(p => !(p.categoryId === cf.categoryId && p.fieldName === cf.fieldName));
      } else {
        return [...prev, cf];
      }
    });
  };

  const normalize = (val: string): string => {
    if (!val) return '';
    if (digitsOnly) {
      const digits = val.replace(/\D/g, '');
      return digits.length >= 3 ? digits : '';
    }
    return val.toLowerCase().replace(/\s+/g, '');
  };

  const runCompare = () => {
    if (!selectedSheetColumn || selectedCategoryFields.length === 0 || vendorRows.length === 0) {
      showToast.warning('Selecione a coluna da planilha e pelo menos uma categoria+campo do inventário', { autoClose: 4000 });
      return;
    }

    const invMap = new Map<string, Array<{ item: any; categoryName: string; fieldName: string; rawValue: string }>>();
    
    selectedCategoryFields.forEach(cf => {
      inventoryItems
        .filter(item => item.categoryId === cf.categoryId)
        .forEach(item => {
          const rawValue = String(item[cf.fieldName] || '');
          const norm = normalize(rawValue);
          if (norm) {
            if (!invMap.has(norm)) invMap.set(norm, []);
            invMap.get(norm)!.push({ item, categoryName: cf.categoryName, fieldName: cf.fieldName, rawValue });
          }
        });
    });

    const matches: Array<{ value: string; sheetValue: string; item: any; categoryName: string; fieldName: string }> = [];
    const onlyInSheet: Array<{ value: string; row: Row }> = [];
    const matchedItems = new Set<string>();
    const matchedSheetValues = new Set<string>();

    vendorRows.forEach(row => {
      const sheetValue = String(row[selectedSheetColumn] || '').trim();
      const norm = normalize(sheetValue);
      
      if (!norm) return;

      const found = invMap.get(norm);
      if (found && found.length > 0) {
        found.forEach(f => {
          matches.push({
            value: norm,
            sheetValue,
            item: f.item,
            categoryName: f.categoryName,
            fieldName: f.fieldName
          });
          matchedItems.add(f.item.id);
        });
        matchedSheetValues.add(norm);
      } else {
        if (!matchedSheetValues.has(norm)) {
          onlyInSheet.push({ value: sheetValue, row });
          matchedSheetValues.add(norm);
        }
      }
    });

    const onlyInInventory: Array<{ id: string; categoryId: string; categoryName: string; displayValue: string; fields: Record<string, string> }> = [];
    
    selectedCategoryFields.forEach(cf => {
      inventoryItems
        .filter(item => item.categoryId === cf.categoryId && !matchedItems.has(item.id))
        .forEach(item => {
          const rawValue = String(item[cf.fieldName] || '');
          const norm = normalize(rawValue);
          if (norm) {
            // Extrair todos os campos do item (exceto id e categoryId)
            const itemFields: Record<string, string> = {};
            Object.keys(item).forEach(key => {
              if (key !== 'id' && key !== 'categoryId') {
                itemFields[key] = String(item[key] || '');
              }
            });
            
            onlyInInventory.push({
              id: item.id,
              categoryId: item.categoryId,
              categoryName: cf.categoryName,
              displayValue: rawValue,
              fields: itemFields
            });
          }
        });
    });

    setResults({ matches, onlyInSheet, onlyInInventory });
  };

  const downloadCSV = (filename: string, kind: 'matches' | 'onlyInSheet' | 'onlyInInventory') => {
    if (!results) return;
    const origin = typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '';
    let header = '';
    let rows: string[] = [];
    
    if (kind === 'matches') {
      header = 'valor_planilha,categoria,campo,valor_inventario,id_item,link';
      rows = results.matches.map(m => {
        const link = m.item?.id && m.item?.categoryId ? `${origin}/categories/${m.item.categoryId}?item=${m.item.id}` : '';
        return [
          `"${m.sheetValue}"`,
          `"${m.categoryName}"`,
          `"${m.fieldName}"`,
          `"${String(m.item?.fields?.[m.fieldName] || '').replace(/"/g, '""')}"`,
          m.item?.id || '',
          link
        ].join(',');
      });
    } else if (kind === 'onlyInSheet') {
      header = selectedSheetColumn + ',' + headers.filter(h => h !== selectedSheetColumn).join(',');
      rows = results.onlyInSheet.map(item => {
        const cells = [item.value];
        headers.filter(h => h !== selectedSheetColumn).forEach(h => {
          cells.push(`"${String(item.row[h] || '').replace(/"/g, '""')}"`);
        });
        return cells.join(',');
      });
    } else {
      header = 'categoria,valor,id,link';
      rows = results.onlyInInventory.map(item => {
        const link = item.id && item.categoryId ? `${origin}/categories/${item.categoryId}?item=${item.id}` : '';
        return [
          `"${item.categoryName}"`,
          `"${item.displayValue}"`,
          item.id,
          link
        ].join(',');
      });
    }

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h3 className="font-bold mb-4 text-lg">DEPARA — Comparador de Patrimônios</h3>
      <p className="text-sm text-gray-600 mb-4">
        📋 Faça upload de uma planilha com números de patrimônio e descubra quais estão no inventário e quais estão faltando.
      </p>

      <div className="mb-4 p-3 border rounded bg-gray-50">
        <label className="block text-sm font-medium mb-2">1. Selecione o arquivo (.csv ou .xlsx)</label>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={onFileChange} className="text-sm" />
        {fileName && <div className="text-xs text-green-600 mt-1">✓ {fileName}</div>}
      </div>

      {headers.length > 0 && (
        <div className="mb-4 p-3 border rounded bg-white">
          <label className="block text-sm font-medium mb-2">2. Selecione a coluna que contém os patrimônios</label>
          <div className="flex gap-2 flex-wrap">
            {headers.map(h => (
              <label key={h} className="inline-flex items-center gap-2 border px-3 py-2 rounded cursor-pointer hover:bg-blue-50" style={{ backgroundColor: selectedSheetColumn === h ? '#dbeafe' : '' }}>
                <input type="radio" name="sheetCol" checked={selectedSheetColumn === h} onChange={() => setSelectedSheetColumn(h)} />
                <span className="text-sm font-mono">{h}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {headers.length > 0 && (
        <div className="mb-4 p-3 border rounded bg-white">
          <label className="block text-sm font-medium mb-2">3. Selecione as categorias e campos onde buscar</label>
          {categoryFields.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">⚠️ Nenhum campo disponível. Certifique-se de que há itens cadastrados no inventário com campos preenchidos.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">Marque as combinações de categoria + campo que você quer comparar com a planilha ({selectedCategoryFields.length} selecionados)</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.from(new Set(categoryFields.map(cf => cf.categoryId))).map(categoryId => {
                  const category = categoryFields.find(cf => cf.categoryId === categoryId);
                  if (!category) return null;
                  
                  const categoryName = category.categoryName;
                  const fieldsInCategory = categoryFields.filter(cf => cf.categoryId === categoryId);
                  const isExpanded = expandedCategories.has(categoryId);
                  const selectedCount = fieldsInCategory.filter(cf => 
                    selectedCategoryFields.some(s => s.categoryId === cf.categoryId && s.fieldName === cf.fieldName)
                  ).length;
                  
                  return (
                    <div key={categoryId} className="border rounded">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(categoryId);
                          } else {
                            newExpanded.add(categoryId);
                          }
                          setExpandedCategories(newExpanded);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{categoryName}</span>
                          <span className="text-xs text-gray-500">({selectedCount}/{fieldsInCategory.length} selecionados)</span>
                        </div>
                        <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 py-2 bg-gray-50 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                            {fieldsInCategory.map((cf, idx) => {
                              const isSelected = selectedCategoryFields.some(s => s.categoryId === cf.categoryId && s.fieldName === cf.fieldName);
                              return (
                                <label key={idx} className="inline-flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-green-50 text-sm border" style={{ backgroundColor: isSelected ? '#d1fae5' : 'white' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleCategoryField(cf)}
                                  />
                                  <span className="text-xs">{cf.fieldName}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const toAdd = fieldsInCategory.filter(cf => 
                                  !selectedCategoryFields.some(s => s.categoryId === cf.categoryId && s.fieldName === cf.fieldName)
                                );
                                setSelectedCategoryFields([...selectedCategoryFields, ...toAdd]);
                              }}
                              className="text-xs px-2 py-1 bg-blue-100 rounded hover:bg-blue-200"
                            >
                              Selecionar todos desta categoria
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedCategoryFields(selectedCategoryFields.filter(s => s.categoryId !== categoryId));
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                            >
                              Limpar desta categoria
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setSelectedCategoryFields([...categoryFields])} className="text-xs px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Selecionar Todos</button>
                <button onClick={() => setSelectedCategoryFields([])} className="text-xs px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Limpar Seleção</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mb-4 p-3 border rounded bg-white">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={digitsOnly} onChange={e => setDigitsOnly(e.target.checked)} />
          <span className="text-sm">Extrair apenas dígitos (recomendado para patrimônios numéricos)</span>
        </label>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={runCompare}
          disabled={!selectedSheetColumn || selectedCategoryFields.length === 0 || vendorRows.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Comparar
        </button>
        <button 
          onClick={() => { 
            setFileName(null); 
            setHeaders([]); 
            setVendorRows([]); 
            setSelectedSheetColumn('');
            setSelectedCategoryFields([]);
            setResults(null); 
            if (fileRef.current) fileRef.current.value = '';
          }} 
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Limpar
        </button>
      </div>

      {results && (
        <div className="mt-6">
          <h4 className="font-bold text-lg mb-4">📊 Resultados da Comparação</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
              <div className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <div>Encontrados</div>
                  <div className="text-sm font-normal">({results.matches.length})</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Patrimônios que existem na planilha E no inventário</p>
              <div className="text-xs max-h-96 overflow-auto space-y-2 bg-white p-2 rounded">
                {results.matches.map((m, i) => (
                  <div key={i} className="p-2 border-b last:border-b-0">
                    <div className="font-bold text-green-700">🔢 {m.sheetValue}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      <span className="bg-green-100 px-1 rounded">{m.categoryName}</span> → {m.fieldName}
                    </div>
                    {m.item?.id && m.item?.categoryId && (
                      <Link href={`/categories/${m.item.categoryId}?item=${m.item.id}`} className="text-blue-600 underline text-xs mt-1 inline-block">
                        Ver no sistema →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => downloadCSV('matches.csv', 'matches')} className="w-full mt-3 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium">
                📥 Exportar CSV
              </button>
            </div>

            <div className="p-4 border-2 border-yellow-300 rounded-lg bg-yellow-50">
              <div className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <div>
                  <div>Só na Planilha</div>
                  <div className="text-sm font-normal">({results.onlyInSheet.length})</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Patrimônios da planilha que NÃO estão no nosso inventário</p>
              <div className="text-xs max-h-96 overflow-auto space-y-1 bg-white p-2 rounded">
                {results.onlyInSheet.map((item, i) => (
                  <div key={i} className="p-2 border-b last:border-b-0 bg-yellow-50">
                    <div className="font-mono font-bold text-yellow-800">🔢 {item.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => downloadCSV('only-in-sheet.csv', 'onlyInSheet')} className="w-full mt-3 px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium">
                📥 Exportar CSV
              </button>
            </div>

            <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
              <div className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div>Só no Inventário</div>
                  <div className="text-sm font-normal">({results.onlyInInventory.length})</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Patrimônios do inventário que NÃO estão na planilha</p>
              <div className="text-xs max-h-96 overflow-auto space-y-2 bg-white p-2 rounded">
                {results.onlyInInventory.map((item, i) => (
                  <div key={i} className="p-2 border-b last:border-b-0">
                    <div className="font-bold text-blue-700">🔢 {item.displayValue}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      <span className="bg-blue-100 px-1 rounded">{item.categoryName}</span>
                    </div>
                    {item.id && item.categoryId && (
                      <Link href={`/categories/${item.categoryId}?item=${item.id}`} className="text-blue-600 underline text-xs mt-1 inline-block">
                        Ver no sistema →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => downloadCSV('only-in-inventory.csv', 'onlyInInventory')} className="w-full mt-3 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
                📥 Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
