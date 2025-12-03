'use client';
import { useEffect, useState } from 'react';
import { getInitialData, saveDuplicateConfig, getDuplicateConfig } from '@/lib/localStorage';
import type { DuplicateConfig } from '@/lib/types';

export default function DuplicateConfigPanel() {
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [config, setConfig] = useState<DuplicateConfig>({ fields: [] });

  useEffect(() => {
    const data = getInitialData();
    console.log('[DuplicateConfig] Carregando configuração...');
    console.log('  - Total de fields definidos:', data.fields?.length || 0);
    console.log('  - Total de items:', data.items?.length || 0);
    
    // collect all unique field keys across categories
    const keys = new Set<string>();
    
    // Primeiro, pegar de data.fields (campos definidos formalmente)
    data.fields?.forEach((f:any) => {
      console.log('    Field definido:', f.key, 'na categoria', f.categoryId);
      keys.add(f.key);
    });
    
    // Depois, inspecionar os items para pegar campos adicionais
    const itemFieldsCount = new Map<string, number>();
    data.items?.forEach((it:any) => {
      Object.keys(it).forEach(k => { 
        if (k !== 'id' && k !== 'categoryId') {
          keys.add(k);
          itemFieldsCount.set(k, (itemFieldsCount.get(k) || 0) + 1);
        }
      });
    });
    
    console.log('  - Campos únicos encontrados:', Array.from(keys));
    console.log('  - Frequência dos campos nos items:');
    itemFieldsCount.forEach((count, field) => {
      console.log(`    ${field}: ${count} items`);
    });
    
    const sortedFields = Array.from(keys).sort();
    setAvailableFields(sortedFields);
    
    const cfg = getDuplicateConfig();
    console.log('  - Campos configurados para duplicados:', cfg.fields);
    setConfig(cfg);
  }, []);

  const toggleField = (key: string) => {
    const newFields = config.fields.includes(key) ? config.fields.filter(k => k !== key) : [...config.fields, key];
    const newCfg = { ...config, fields: newFields };
    setConfig(newCfg);
    saveDuplicateConfig(newCfg);
  };

  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-3">Detector de Duplicados</h3>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
        <p className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          Como funciona:
        </p>
        <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
          <li>• <strong>Detecção Automática:</strong> Busca duplicados em TODAS as categorias baseado nos campos selecionados</li>
          <li>• <strong>Alerta ao Adicionar:</strong> Avisa quando você tenta adicionar um item que já existe</li>
          <li>• <strong>Dica:</strong> Selecione apenas 1-2 campos chave (ex: "cpu" ou "patrimonio") para melhor detecção</li>
        </ul>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Escolha os campos que o agente deve usar para detectar itens duplicados:
      </p>
      {config.fields.length > 3 && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>
              <strong>Atenção:</strong> Você selecionou {config.fields.length} campos. Quanto mais campos, menos duplicados serão encontrados!
              <br />
              <strong>Recomendação:</strong> Selecione apenas 1-2 campos chave (ex: apenas "cpu" ou "patrimonio").
            </span>
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
        <span>O detector busca items com <strong>TODOS</strong> os campos selecionados iguais em <strong>TODAS</strong> as categorias.</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {availableFields.length === 0 && <div className="text-sm text-gray-500">Nenhum campo disponível</div>}
        {availableFields.map((k) => (
          <button key={k} onClick={() => toggleField(k)} className={`px-3 py-1 rounded ${config.fields.includes(k) ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
