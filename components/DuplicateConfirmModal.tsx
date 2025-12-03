'use client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DuplicateInfo {
  field: string;
  value: string;
  matches: Array<{
    id: string;
    categoryId: string;
    [key: string]: any;
  }>;
}

interface DuplicateConfirmModalProps {
  duplicates: DuplicateInfo[];
  categories: Array<{ id: string; name: string }>;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function DuplicateConfirmModal({ duplicates, categories, onConfirm, onCancel, isOpen }: DuplicateConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                Possível Duplicado Encontrado
              </h2>
              <p className="text-white/90 text-sm">
                Encontramos {duplicates.length} campo(s) com valores duplicados
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="space-y-4">
            {duplicates.map((dup, idx) => {
              const categoryMap = new Map(categories.map(c => [c.id, c.name]));
              
              return (
                <div key={idx} className="border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Campo: <span className="text-amber-600 dark:text-amber-400">"{dup.field}"</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Valor: <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">"{dup.value}"</span>
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-3 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                        </svg>
                        {dup.matches.length} item(ns) já existente(s) com este valor
                      </div>
                      
                      {/* Lista de items duplicados */}
                      <div className="space-y-2 mt-3">
                        {dup.matches.slice(0, 3).map((match, mIdx) => {
                          const catName = categoryMap.get(match.categoryId) || 'Desconhecida';
                          const importantFields = ['hostname', 'ip', 'patrimonio', 'setor', 'local', 'usuario'];
                          const displayFields = importantFields.filter(f => match[f] && match[f] !== dup.value);
                          
                          return (
                            <div key={mIdx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-700 hover-lift animate-scale-in" style={{animationDelay: `${mIdx * 50}ms`}}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    {catName}
                                  </span>
                                </div>
                                <Link 
                                  href={`/categories/${match.categoryId}`}
                                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                  target="_blank"
                                >
                                  Ver →
                                </Link>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
                                ID: {match.id.slice(0, 16)}...
                              </div>
                              {displayFields.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {displayFields.map(f => (
                                    <span key={f} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                      <strong>{f}:</strong> {match[f]}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dup.matches.length > 3 && (
                          <div className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium py-2">
                            + {dup.matches.length - 3} item(ns) adicional(is)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning message */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <span><strong>Importante:</strong> Mesmo com duplicados detectados, você pode adicionar este item se tiver certeza que é necessário.</span>
            </p>
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
            onClick={onConfirm}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Adicionar Mesmo Assim
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
