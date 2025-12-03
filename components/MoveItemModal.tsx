'use client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { Category, Field, Item, MovementReason, ItemStatus } from '@/lib/types';

interface MoveItemModalProps {
  item: Item;
  currentCategory: Category;
  allCategories: Category[];
  allFields: Field[];
  onConfirm: (data: {
    targetCategoryId: string;
    selectedFields: string[];
    reason: MovementReason;
    reasonText: string;
    newStatus?: ItemStatus;
  }) => void;
  onCancel: () => void;
}

const REASON_OPTIONS: Array<{ value: MovementReason; label: string; description: string }> = [
  { value: 'correction', label: 'Correção', description: 'Dados estavam incorretos' },
  { value: 'transfer', label: 'Transferência', description: 'Item mudou de categoria/local' },
  { value: 'to_stock', label: 'Para Estoque', description: 'Guardado por falta de uso' },
  { value: 'to_maintenance', label: 'Para Manutenção', description: 'Equipamento com defeito' },
  { value: 'from_stock', label: 'Retorno do Estoque', description: 'Volta para uso ativo' },
  { value: 'from_maintenance', label: 'Retorno da Manutenção', description: 'Equipamento reparado' },
  { value: 'other', label: 'Outro Motivo', description: 'Especifique abaixo' },
];

export function MoveItemModal({ item, currentCategory, allCategories, allFields, onConfirm, onCancel }: MoveItemModalProps) {
  const [mounted, setMounted] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState(currentCategory.id);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reason, setReason] = useState<MovementReason>('transfer');
  const [reasonText, setReasonText] = useState('');
  const [newStatus, setNewStatus] = useState<ItemStatus>(item.status || 'active');

  // Get available fields from current item
  const itemFields = Object.keys(item).filter(k => k !== 'id' && k !== 'categoryId' && k !== 'status');

  useEffect(() => {
    setMounted(true);
    // Auto-select all fields by default
    setSelectedFields(itemFields);
    
    // Prevent scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(itemFields);
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleConfirm = () => {
    if (selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para transferir');
      return;
    }
    
    if (!reasonText.trim() && (reason === 'other' || reason === 'correction')) {
      alert('Por favor, descreva o motivo da movimentação');
      return;
    }

    onConfirm({
      targetCategoryId,
      selectedFields,
      reason,
      reasonText: reasonText.trim(),
      newStatus,
    });
  };

  const targetCategory = allCategories.find(c => c.id === targetCategoryId);
  const isMovingToSpecialCategory = targetCategoryId !== currentCategory.id;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                Movimentar Item
              </h2>
              <p className="text-white/90 text-sm">
                De: <strong>{currentCategory.name}</strong> {targetCategory && targetCategory.id !== currentCategory.id && `→ Para: ${targetCategory.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          <div className="space-y-6">
            {/* Target Category */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Categoria de Destino
              </label>
              <select
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Status do Item
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setNewStatus('active')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    newStatus === 'active'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                  }`}
                >
                  <div className="font-semibold">Ativo</div>
                  <div className="text-xs mt-1 opacity-75">Em uso</div>
                </button>
                <button
                  onClick={() => setNewStatus('stock')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    newStatus === 'stock'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="font-semibold">Estoque</div>
                  <div className="text-xs mt-1 opacity-75">Guardado</div>
                </button>
                <button
                  onClick={() => setNewStatus('maintenance')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    newStatus === 'maintenance'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  <div className="font-semibold">Manutenção</div>
                  <div className="text-xs mt-1 opacity-75">Reparo</div>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Motivo da Movimentação
              </label>
              <div className="space-y-2">
                {REASON_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      reason === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={opt.value}
                      checked={reason === opt.value}
                      onChange={(e) => setReason(e.target.value as MovementReason)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{opt.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason Text */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Observações {(reason === 'other' || reason === 'correction') && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Descreva os detalhes da movimentação..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Field Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Campos a Copiar ({selectedFields.length}/{itemFields.length})
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/20 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {itemFields.map(field => {
                    const fieldValue = item[field];
                    const isSelected = selectedFields.includes(field);
                    
                    return (
                      <label
                        key={field}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFieldToggle(field)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {field}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {fieldValue || '(vazio)'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Apenas os campos selecionados serão copiados para a nova categoria. Os demais ficarão em branco.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedFields.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Movimentação
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
