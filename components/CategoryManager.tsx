'use client';
import { useState } from 'react';
import { getInitialData, saveData } from '@/lib/localStorage';
import { nanoid } from 'nanoid';
import type { Category, Field } from '@/lib/types';

export function CategoryManager({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [categoryName, setCategoryName] = useState('');
  const [fields, setFields] = useState<Omit<Field, 'id' | 'categoryId'>[]>([]);
  const [currentField, setCurrentField] = useState({ name: '', key: '', type: 'string' as const });

  const addField = () => {
    if (!currentField.name || !currentField.key) return;
    setFields([...fields, { ...currentField }]);
    setCurrentField({ name: '', key: '', type: 'string' });
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      alert('Digite um nome para a categoria');
      return;
    }

    const data = getInitialData();
    const categoryId = nanoid();

    const newCategory: Category = {
      id: categoryId,
      name: categoryName,
    };

    const newFields: Field[] = fields.map((field) => ({
      ...field,
      id: nanoid(),
      categoryId,
    }));

    data.categories.push(newCategory);
    data.fields.push(...newFields);
    saveData(data);
    try {
      const { addActivity } = await import('@/lib/localStorage');
      addActivity({ type: 'create', title: 'Nova Categoria', description: `Categoria ${categoryName} criada` });
    } catch (e) {}

    alert(`✅ Categoria "${categoryName}" criada com sucesso!`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nova Categoria</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Passo {step} de 2
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Categoria</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Computadores, Monitores, Televisões..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Dica</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Escolha um nome descritivo para sua categoria. No próximo passo, você poderá definir quais campos (colunas) essa categoria terá.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Definir Campos da Categoria "{categoryName}"</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Adicione os campos que farão parte desta categoria (ex: Patrimônio, Modelo, Setor, etc.)
                </p>

                <div className="panel bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nome do Campo</label>
                      <input
                        type="text"
                        value={currentField.name}
                        onChange={(e) => setCurrentField({ ...currentField, name: e.target.value })}
                        placeholder="Ex: Patrimônio"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Chave (ID)</label>
                      <input
                        type="text"
                        value={currentField.key}
                        onChange={(e) => setCurrentField({ ...currentField, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        placeholder="Ex: patrimonio"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Tipo</label>
                      <select
                        value={currentField.type}
                        onChange={(e) => setCurrentField({ ...currentField, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="string">Texto</option>
                        <option value="number">Número</option>
                        <option value="boolean">Sim/Não</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={addField}
                    disabled={!currentField.name || !currentField.key}
                    className="btn btn-primary w-full text-sm"
                  >
                    + Adicionar Campo
                  </button>
                </div>
              </div>

              {fields.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Campos Adicionados ({fields.length})</h4>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{field.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {field.key} • {field.type === 'string' ? 'Texto' : field.type === 'number' ? 'Número' : 'Sim/Não'}
                          </p>
                        </div>
                        <button
                          onClick={() => removeField(index)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="btn btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!categoryName.trim()}
                className="btn btn-primary"
              >
                Próximo →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="btn btn-ghost">
                ← Voltar
              </button>
              <button onClick={handleSubmit} className="btn btn-primary">
                ✓ Criar Categoria
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
