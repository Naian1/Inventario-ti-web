"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getAllReturnRecords } from '@/lib/localStorage';
import type { ReturnRecord } from '@/lib/types';

type SortField = 'timestamp' | 'itemName' | 'returnedTo' | 'estimatedValue';
type SortDirection = 'asc' | 'desc';

const RETURN_REASON_LABELS: Record<string, string> = {
  warranty: 'Garantia',
  irreparable: 'Irreparável',
  replacement: 'Substituição',
  other: 'Outro'
};

export default function DevolucoesPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [returns, searchTerm, filterReason, sortField, sortDirection]);

  const loadReturns = () => {
    const data = getAllReturnRecords();
    setReturns(data);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...returns];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.itemName.toLowerCase().includes(term) ||
        r.returnedTo.toLowerCase().includes(term) ||
        r.invoiceNumber.toLowerCase().includes(term) ||
        r.notes?.toLowerCase().includes(term)
      );
    }

    // Filtro de motivo
    if (filterReason !== 'all') {
      filtered = filtered.filter(r => r.returnReason === filterReason);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'timestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'estimatedValue') {
        aValue = parseFloat(aValue?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
        bValue = parseFloat(bValue?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      } else {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReturns(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Data',
      'Item',
      'Motivo',
      'Descrição',
      'Devolvido Para',
      'NF Número',
      'NF Data',
      'Valor Estimado',
      'Usuário',
      'Observações'
    ];

    const rows = filteredReturns.map(r => [
      new Date(r.timestamp).toLocaleString('pt-BR'),
      r.itemName,
      RETURN_REASON_LABELS[r.returnReason] || r.returnReason,
      r.returnReasonText || '',
      r.returnedTo,
      r.invoiceNumber,
      new Date(r.invoiceDate).toLocaleDateString('pt-BR'),
      r.estimatedValue || '',
      r.userName,
      r.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `devolucoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Equipamentos Devolvidos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Histórico completo de devoluções e retornos a fornecedores
          </p>
        </div>

        {/* Filtros e Ações */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Item, fornecedor, NF..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Filtro por Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Motivo
              </label>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos os Motivos</option>
                <option value="warranty">Garantia</option>
                <option value="irreparable">Irreparável</option>
                <option value="replacement">Substituição</option>
                <option value="other">Outro</option>
              </select>
            </div>

            {/* Botão Exportar */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                disabled={filteredReturns.length === 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{returns.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Devoluções</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {returns.filter(r => r.returnReason === 'warranty').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Garantia</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600">
                  {returns.filter(r => r.returnReason === 'irreparable').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Irreparáveis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {returns.filter(r => r.returnReason === 'replacement').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Substituição</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Devoluções */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {filteredReturns.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm || filterReason !== 'all' ? 'Nenhuma devolução encontrada com os filtros aplicados' : 'Nenhum equipamento foi devolvido ainda'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Data</span>
                        <SortIcon field="timestamp" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('itemName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Item</span>
                        <SortIcon field="itemName" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('returnedTo')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Fornecedor</span>
                        <SortIcon field="returnedTo" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nota Fiscal
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('estimatedValue')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Valor</span>
                        <SortIcon field="estimatedValue" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReturns.map((returnRecord) => (
                    <tr key={returnRecord.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(returnRecord.timestamp).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{returnRecord.itemName}</div>
                        <div className="text-xs text-gray-500">por {returnRecord.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2 py-1 text-xs font-semibold rounded-full
                          ${returnRecord.returnReason === 'warranty' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''}
                          ${returnRecord.returnReason === 'irreparable' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' : ''}
                          ${returnRecord.returnReason === 'replacement' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                          ${returnRecord.returnReason === 'other' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' : ''}
                        `}>
                          {RETURN_REASON_LABELS[returnRecord.returnReason] || returnRecord.returnReason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {returnRecord.returnedTo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>{returnRecord.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(returnRecord.invoiceDate).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {returnRecord.estimatedValue || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedReturn(returnRecord)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedReturn(null)}
          />
          
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Detalhes da Devolução</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Item</p>
                  <p className="text-lg text-gray-900 dark:text-white">{selectedReturn.itemName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Data da Devolução</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {new Date(selectedReturn.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Motivo</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {RETURN_REASON_LABELS[selectedReturn.returnReason]}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Devolvido Para</p>
                  <p className="text-lg text-gray-900 dark:text-white">{selectedReturn.returnedTo}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Número da NF</p>
                  <p className="text-lg text-gray-900 dark:text-white">{selectedReturn.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Data da NF</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {new Date(selectedReturn.invoiceDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {selectedReturn.estimatedValue && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Valor Estimado</p>
                    <p className="text-lg text-gray-900 dark:text-white">{selectedReturn.estimatedValue}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Registrado Por</p>
                  <p className="text-lg text-gray-900 dark:text-white">{selectedReturn.userName}</p>
                </div>
              </div>

              {selectedReturn.returnReasonText && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Descrição do Motivo</p>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {selectedReturn.returnReasonText}
                  </p>
                </div>
              )}

              {selectedReturn.notes && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Observações</p>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {selectedReturn.notes}
                  </p>
                </div>
              )}

              {selectedReturn.invoiceAttachment && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Nota Fiscal Anexada</p>
                  <a
                    href={selectedReturn.invoiceAttachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Baixar Nota Fiscal
                  </a>
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end rounded-b-lg">
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
