'use client';
import { useEffect, useState } from 'react';
import { getInitialData, saveDuplicateConfig, getDuplicateConfig } from '@/lib/localStorage';
import type { DuplicateConfig } from '@/lib/types';

export default function DuplicateConfigPanel() {
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [config, setConfig] = useState<DuplicateConfig>({ fields: [] });

  useEffect(() => {
    const data = getInitialData();
    console.log('🔍 DuplicateConfig Debug:');
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
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-medium text-blue-900 mb-2">📋 Como funciona:</p>
        <ul className="text-blue-800 space-y-1 text-xs">
          <li>• <strong>Detecção Automática:</strong> Busca duplicados em TODAS as categorias baseado nos campos selecionados</li>
          <li>• <strong>Alerta ao Adicionar:</strong> Avisa quando você tenta adicionar um item que já existe</li>
          <li>• <strong>Dica:</strong> Selecione apenas 1-2 campos chave (ex: "cpu" ou "patrimonio") para melhor detecção</li>
        </ul>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Escolha os campos que o agente deve usar para detectar itens duplicados:
      </p>
      {config.fields.length > 3 && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Atenção:</strong> Você selecionou {config.fields.length} campos. Quanto mais campos, menos duplicados serão encontrados!
            <br />
            <strong>Recomendação:</strong> Selecione apenas 1-2 campos chave (ex: apenas "cpu" ou "patrimonio").
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500 mb-3">
        🔍 O detector busca items com <strong>TODOS</strong> os campos selecionados iguais em <strong>TODAS</strong> as categorias.
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
