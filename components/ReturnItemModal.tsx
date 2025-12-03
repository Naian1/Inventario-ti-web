"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ReturnReason = 'warranty' | 'irreparable' | 'replacement' | 'other';

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReturnData) => void;
  itemName: string;
}

export interface ReturnData {
  returnReason: ReturnReason;
  returnReasonText: string;
  returnedTo: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAttachment?: string;
  estimatedValue: string;
  notes: string;
}

const RETURN_REASONS = [
  {
    value: 'warranty' as ReturnReason,
    label: 'Garantia',
    description: 'Equipamento em garantia com defeito de fabricação'
  },
  {
    value: 'irreparable' as ReturnReason,
    label: 'Irreparável',
    description: 'Dano permanente que não pode ser reparado'
  },
  {
    value: 'replacement' as ReturnReason,
    label: 'Substituição',
    description: 'Troca por modelo mais novo ou atualizado'
  },
  {
    value: 'other' as ReturnReason,
    label: 'Outro Motivo',
    description: 'Especifique o motivo na descrição'
  }
];

export default function ReturnItemModal({ isOpen, onClose, onConfirm, itemName }: ReturnItemModalProps) {
  const [mounted, setMounted] = useState(false);
  const [returnReason, setReturnReason] = useState<ReturnReason>('warranty');
  const [returnReasonText, setReturnReasonText] = useState('');
  const [returnedTo, setReturnedTo] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setInvoiceFile(null);
    setInvoicePreview('');
  };

  const handleConfirm = () => {
    if (!returnedTo.trim()) {
      alert('Por favor, informe o fornecedor/destino da devolução');
      return;
    }
    
    if (!invoiceNumber.trim()) {
      alert('Por favor, informe o número da nota fiscal');
      return;
    }
    
    if (!invoiceDate) {
      alert('Por favor, informe a data da nota fiscal');
      return;
    }
    
    if ((returnReason === 'other' || returnReason === 'irreparable') && !returnReasonText.trim()) {
      alert('Por favor, descreva o motivo da devolução');
      return;
    }

    const data: ReturnData = {
      returnReason,
      returnReasonText,
      returnedTo,
      invoiceNumber,
      invoiceDate,
      invoiceAttachment: invoicePreview,
      estimatedValue,
      notes
    };

    onConfirm(data);
    resetForm();
  };

  const resetForm = () => {
    setReturnReason('warranty');
    setReturnReasonText('');
    setReturnedTo('');
    setInvoiceNumber('');
    setInvoiceDate('');
    setInvoiceFile(null);
    setInvoicePreview('');
    setEstimatedValue('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 animate-fadeIn">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">Registrar Devolução de Equipamento</h2>
          <p className="text-red-100 mt-1">Item: {itemName}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Motivo da Devolução */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Motivo da Devolução *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RETURN_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`
                    flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${returnReason === reason.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="returnReason"
                      value={reason.value}
                      checked={returnReason === reason.value}
                      onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                      className="mr-3 text-red-500 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {reason.label}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
                    {reason.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Descrição do Motivo (condicional) */}
          {(returnReason === 'other' || returnReason === 'irreparable') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Descrição do Motivo *
              </label>
              <textarea
                value={returnReasonText}
                onChange={(e) => setReturnReasonText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Descreva em detalhes o motivo da devolução..."
              />
            </div>
          )}

          {/* Fornecedor/Destino */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Devolvido Para (Fornecedor) *
            </label>
            <input
              type="text"
              value={returnedTo}
              onChange={(e) => setReturnedTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              placeholder="Nome do fornecedor ou destino"
            />
          </div>

          {/* Dados da Nota Fiscal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Número da Nota Fiscal *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Ex: 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data da Nota Fiscal *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Upload da Nota Fiscal */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Anexar Nota Fiscal (Opcional)
            </label>
            
            {!invoiceFile ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="invoice-upload"
                />
                <label 
                  htmlFor="invoice-upload"
                  className="cursor-pointer"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Clique para selecionar um arquivo
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF ou imagem (JPG, PNG)
                  </p>
                </label>
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoiceFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(invoiceFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Valor Estimado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Valor Estimado (Opcional)
            </label>
            <input
              type="text"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              placeholder="R$ 0,00"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Observações Adicionais
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              placeholder="Informações adicionais sobre a devolução..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 font-medium transition-colors"
          >
            Confirmar Devolução
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
