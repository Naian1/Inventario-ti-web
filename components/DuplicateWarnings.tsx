"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getInitialData } from '@/lib/localStorage';
import type { Item } from '@/lib/types';
import { showToast } from '@/lib/toast';

function normalizeValue(v: any) {
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

export default function DuplicateWarnings() {
  const [fields, setFields] = useState<string[]>([]);
  const [groups, setGroups] = useState<Array<{ key: string; items: Item[] }>>([]);
  const [running, setRunning] = useState(false);
  const [autoRunDone, setAutoRunDone] = useState(false);

  const router = useRouter();

  const runDetector = useCallback(async () => {
    setRunning(true);
    try {
      const data = getInitialData();
      console.log('🔎 Detector de Duplicados iniciado');
      console.log('  - Campos configurados:', fields);
      console.log('  - Total de items:', data.items?.length || 0);
      
      if (!fields || fields.length === 0) {
        setGroups([]);
        // prefer a friendly confirm that offers to navigate to the config panel
        const go = typeof window !== 'undefined' ? window.confirm('Nenhum campo configurado para detecção de duplicados. Deseja ir para "Configurar Duplicados" agora?') : false;
        if (go) router.push('/painel');
        return;
      }

      // Nova abordagem: verificar duplicados POR CAMPO INDIVIDUAL
      const fieldMaps = new Map<string, Map<string, Item[]>>();
      
      // Criar um mapa para cada campo
      fields.forEach(field => {
        fieldMaps.set(field, new Map<string, Item[]>());
      });
      
      let itemsProcessed = 0;
      
      data.items.forEach((item, idx) => {
        itemsProcessed++;
        
        // Para cada campo configurado, indexar o item pelo valor daquele campo
        fields.forEach(field => {
          const value = item[field];
          if (value !== undefined && value !== null) {
            const normalized = normalizeValue(value);
            if (normalized.length > 0) {
              const fieldMap = fieldMaps.get(field)!;
              if (!fieldMap.has(normalized)) {
                fieldMap.set(normalized, []);
              }
              fieldMap.get(normalized)!.push(item);
            }
          }
        });
        
        if (idx < 3) {
          console.log(`  - Item ${idx} exemplo:`);
          console.log(`    ID: ${item.id}, Categoria: ${item.categoryId}`);
          fields.forEach(f => {
            const value = item[f];
            const normalized = value ? normalizeValue(value) : '';
            console.log(`    ${f}: "${value}" -> normalizado: "${normalized}"`);
          });
        }
      });
      
      console.log(`  - Items processados: ${itemsProcessed}`);
      console.log(`  - Campos verificados: ${fields.join(', ')}`);

      // Encontrar duplicados em cada campo
      const found: Array<{ key: string; items: Item[]; field: string }> = [];
      
      fieldMaps.forEach((fieldMap, field) => {
        console.log(`\n  🔍 Verificando campo "${field}":`);
        let duplicatesInField = 0;
        
        fieldMap.forEach((items, value) => {
          if (items.length > 1) {
            duplicatesInField++;
            console.log(`    ✅ Duplicado! Valor: "${value}" - ${items.length} items`);
            items.forEach(it => console.log(`      - Item ID: ${it.id} (Categoria: ${it.categoryId})`));
            
            found.push({ 
              key: `${field}=${value}`, 
              items,
              field 
            });
          }
        });
        
        console.log(`    Total de valores duplicados em "${field}": ${duplicatesInField}`);
      });
      
      console.log(`\n  - Total de grupos duplicados: ${found.length}`);

      setGroups(found.sort((a, b) => b.items.length - a.items.length));

      try {
        const { addActivity } = await import('@/lib/localStorage');
        addActivity({ type: 'warning', title: 'Detecção de duplicados', description: `${found.length} grupos suspeitos encontrados` });
      } catch (e) {}
    } finally {
      setRunning(false);
    }
  }, [fields, router]);

  useEffect(() => {
    const data = getInitialData();
    const cfg = data.duplicateConfig || { fields: [] };
    setFields(cfg.fields || []);
  }, []);

  // Executar detecção automaticamente ao carregar se houver campos configurados
  useEffect(() => {
    if (fields.length > 0 && !autoRunDone) {
      setAutoRunDone(true);
      runDetector();
    }
  }, [fields, autoRunDone, runDetector]);

  const exportCsv = () => {
    if (groups.length === 0) return showToast.warning('Nenhum duplicado para exportar');
    const rows: string[] = [];
    rows.push(['group_id','item_id','category_id','values'].join(','));
    groups.forEach((g, idx) => {
      g.items.forEach((it) => {
        const vals = fields.map(f => (it[f] || '').toString().replace(/"/g, '""')).join(' | ');
        rows.push([`group_${idx+1}`, it.id, it.categoryId, `"${vals}"`].join(','));
      });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duplicates_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Detecção de Duplicados</h3>
          {groups.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {groups.length} grupo(s) de duplicados encontrado(s) | Rolagem disponível
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runDetector} className="btn btn-sm btn-primary" disabled={running}>{running ? 'Rodando...' : 'Rodar detector'}</button>
          <button onClick={exportCsv} className="btn btn-sm btn-ghost">Exportar CSV</button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-sm text-gray-500">
          ⚠️ Nenhum campo configurado. Vá em "Configurar Duplicados" acima para selecionar campos.
          <br />
          <small className="text-xs text-gray-400">Selecione apenas 1-2 campos chave para melhor detecção</small>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-sm">
          {running ? '⏳ Processando...' : (
            <div>
              <div className="text-green-600 font-medium">✓ Nenhum duplicado encontrado</div>
              <div className="text-xs text-gray-500 mt-2">
                <strong>Campos monitorados:</strong> {fields.join(', ')}
                {fields.length > 3 && <span className="text-yellow-600"> ⚠️ ({fields.length} campos - muitos campos dificultam encontrar duplicados!)</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Busca em TODAS as categorias | 
                Detector executado: {autoRunDone ? 'Sim' : 'Não'} |
                Console (F12) para logs detalhados
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {groups.map((g, i) => {
            const [field, value] = g.key.split('=');
            return (
              <div key={i} className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-red-900 dark:text-red-100">
                    ⚠️ Duplicado no campo "{field}" — {g.items.length} itens com valor "{value}"
                  </div>
                </div>
                <div className="text-sm space-y-2 mt-3 max-h-96 overflow-y-auto">
                  {g.items.map((it, idx) => {
                    // Buscar nome real da categoria
                    const data = getInitialData();
                    const category = data.categories.find(c => c.id === it.categoryId);
                    const categoryName = category ? category.name : 'Categoria ' + it.categoryId.slice(0, 8);
                    
                    return (
                      <div key={`${it.id}-${i}-${idx}`} className="p-2 bg-white dark:bg-gray-800 rounded border hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-xs text-gray-700 dark:text-gray-300">ID: {it.id.slice(0, 12)}...</div>
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Categoria: {categoryName}</div>
                          </div>
                          <Link href={`/categories/${it.categoryId}`} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                            Ver item
                          </Link>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex flex-wrap gap-2">
                          {fields.map(f => (
                            <span key={f} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              <strong>{f}:</strong> {it[f] || '-'}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
