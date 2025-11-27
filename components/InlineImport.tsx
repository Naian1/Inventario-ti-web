'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { getInitialData, saveData, canAddItems, getDuplicateConfig, addActivity } from '@/lib/localStorage';
import { nanoid } from 'nanoid';
import { showToast } from '@/lib/toast';

function slugifyKey(s: any) {
  if (s === undefined || s === null) return '';
  const str = String(s).trim();
  if (!str) return '';
  return str
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_');
}

export function InlineImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [multiSheets, setMultiSheets] = useState<any[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [createNewCategory, setCreateNewCategory] = useState(false);
  const [sheetOptions, setSheetOptions] = useState<Record<string, any>>({});
  const [xlsxAcknowledged, setXlsxAcknowledged] = useState(false);
  const [xlsxWarningVisible, setXlsxWarningVisible] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [autoCreateFields, setAutoCreateFields] = useState(true);
  const [showMapping, setShowMapping] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();

    // Preview data
    if (ext === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        complete: (result) => {
          setPreviewData(result.data as any[]);
          setShowModal(true);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      // XLSX: use dynamic import and support multiple sheets

      // Show security warning and require acknowledgement before parsing
      setXlsxWarningVisible(true);
      setShowModal(true);
      setMultiSheets(null);
      setPreviewData(null);
      // store file in state and wait for user acknowledgement; parsing will continue when modal is shown
    }
  };

  const parsePendingXlsx = async (fileToParse: File | null) => {
    if (!fileToParse) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const sheets: any[] = [];
        wb.SheetNames.forEach((sheetName: string) => {
          const ws = wb.Sheets[sheetName];
          const rowsAll = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

          // find first non-empty row to use as headers
          let headerRowIndex = rowsAll.findIndex((r: any) => Array.isArray(r) && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''));
          if (headerRowIndex === -1) headerRowIndex = 0;

          const rawHeaders = (rowsAll[headerRowIndex] || []) as any[];
          const headers = rawHeaders.map((h: any, i: number) => {
            const v = (h === undefined || h === null || String(h).trim() === '') ? `col_${i}` : String(h).trim();
            return v;
          });

          const previewRows = rowsAll.slice(headerRowIndex + 1, headerRowIndex + 6).map((r: any) => {
            const obj: any = {};
            headers.forEach((h: any, i: number) => {
              obj[h || `col_${i}`] = Array.isArray(r) ? r[i] : undefined;
            });
            return obj;
          });

          const dataRows = rowsAll.slice(headerRowIndex + 1);
          const rowsObjects = dataRows.map((r: any) => {
            const obj: any = {};
            headers.forEach((h: any, i: number) => {
              obj[h || `col_${i}`] = Array.isArray(r) ? r[i] : undefined;
            });
            return obj;
          });

          sheets.push({ name: sheetName, headers, preview: previewRows, rows: rowsObjects });
        });
        setMultiSheets(sheets);
        // default sheetOptions: import true, use sheet name as new category
        const opts: Record<string, any> = {};
        sheets.forEach((s) => {
          opts[s.name] = { import: true, createNew: true, newName: s.name, existingCategoryId: '' };
        });
        setSheetOptions(opts);
        setShowModal(true);
        setXlsxWarningVisible(false);
      };
      reader.readAsBinaryString(fileToParse);
    } catch (err) {
      showToast.error('Erro ao processar arquivo XLSX.');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    if (!canAddItems()) {
      showToast.error('Você não tem permissão para importar dados.');
      return;
    }

    setIsImporting(true);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          complete: (result) => {
            processImport(result.data as any[]);
          },
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        // If multiSheets is populated, import based on sheetOptions
        if (multiSheets && multiSheets.length > 0) {
          // iterate sheets
          const data = getInitialData();
          for (const sheet of multiSheets) {
            const opt = sheetOptions[sheet.name];
            if (!opt || !opt.import) continue;

            let categoryId = opt.existingCategoryId || '';
            if (opt.createNew) {
              const newCategoryId = nanoid();
              data.categories.push({ id: newCategoryId, name: opt.newName.trim() || sheet.name });
              categoryId = newCategoryId;
            }

            if (!categoryId) continue;

            if (autoCreateFields && sheet.rows.length > 0) {
              const existingFields = data.fields.filter((f) => f.categoryId === categoryId);
              const existingFieldKeys = new Set(existingFields.map((f) => f.key));
              const firstRow = sheet.rows[0] || {};
                Object.keys(firstRow).forEach(columnName => {
                  const fieldKey = slugifyKey(columnName) || `col_${Object.keys(firstRow).indexOf(columnName)}`;
                if (!existingFieldKeys.has(fieldKey)) {
                  data.fields.push({ id: nanoid(), categoryId, name: columnName, key: fieldKey, type: 'string' });
                }
              });
            }

            // duplicate config for multi-sheet import
            const dupCfg = getDuplicateConfig();
            const dupFields: string[] = (dupCfg && dupCfg.fields) ? dupCfg.fields : [];
            function normalizeValue(v: any) { if (v === null || v === undefined) return ''; return String(v).trim().toLowerCase(); }

            for (const row of sheet.rows) {
              const mappedRow: any = { id: nanoid(), categoryId };
              Object.entries(row).forEach(([key, value]) => {
                  const targetKey = columnMapping[key] || slugifyKey(key);
                if (value !== undefined && value !== null && value !== '') {
                  mappedRow[targetKey] = value;
                }
              });

              let skip = false;
              if (dupFields && dupFields.length > 0) {
                const signature = dupFields.map(f => normalizeValue(mappedRow[f] || '')).join('||');
                const nonEmpty = signature.replace(/\|\|/g, '');
                if (nonEmpty.length > 0) {
                  const matches = data.items.filter(it => {
                    const sig = dupFields.map(f => normalizeValue(it[f] || '')).join('||');
                    return sig === signature;
                  });
                  if (matches.length > 0) {
                    const vals = dupFields.map(f => `${f}: ${mappedRow[f] || '-'}`).join('\n');
                    const ids = matches.map(m => m.id).join(', ');
                    const confirmMsg = `Possível duplicado encontrado (${matches.length}): IDs existentes: ${ids}\n${vals}\n\nDeseja adicionar este item mesmo assim?`;
                    const go = typeof window !== 'undefined' ? window.confirm(confirmMsg) : true;
                    if (!go) skip = true;
                  }
                }
              }

              if (!skip) data.items.push(mappedRow);
            }
          }
          saveData(data);
          // register activity
          try {
            const { addActivity } = await import('@/lib/localStorage');
            addActivity({ type: 'import', title: 'Importação', description: `Importação de múltiplas sheets: ${multiSheets.length} sheets processadas` });
          } catch (e) {
            // ignore
          }
          showToast.success('Importação concluída com sucesso!');
          setIsImporting(false);
          window.location.reload();
          return;
        }

        // Fallback: read first sheet only
        const reader = new FileReader();
        reader.onload = async (e) => {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(e.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rowsAll = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
          let headerRowIndex = rowsAll.findIndex((r: any) => Array.isArray(r) && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''));
          if (headerRowIndex === -1) headerRowIndex = 0;
          const headers = (rowsAll[headerRowIndex] || []).map((h: any, i: number) => (h === undefined || h === null || String(h).trim() === '') ? `col_${i}` : String(h).trim());
          const dataRows = rowsAll.slice(headerRowIndex + 1).map((r: any) => {
            const obj: any = {};
            headers.forEach((h: any, i: number) => {
              obj[h || `col_${i}`] = Array.isArray(r) ? r[i] : undefined;
            });
            return obj;
          });
          processImport(dataRows);
        };
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      showToast.error('Erro ao importar arquivo. Verifique o formato.');
      setIsImporting(false);
    }
  };

  const processImport = (rows: any[]) => {
    const data = getInitialData();
    let categoryId = selectedCategory;

    // Criar nova categoria se necessário
    if (createNewCategory && newCategoryName.trim()) {
      const newCategoryId = nanoid();
      data.categories.push({
        id: newCategoryId,
        name: newCategoryName.trim(),
      });
      categoryId = newCategoryId;
    }

    if (!categoryId) {
      showToast.warning('Selecione uma categoria ou crie uma nova!');
      setIsImporting(false);
      return;
    }

    // Auto-criar campos se ativado
    if (autoCreateFields && rows.length > 0) {
      const existingFields = data.fields.filter(f => f.categoryId === categoryId);
      const existingFieldKeys = new Set(existingFields.map(f => f.key));
      
      const firstRow = rows[0];
      Object.keys(firstRow).forEach(columnName => {
        const fieldKey = slugifyKey(columnName) || `col_${Object.keys(firstRow).indexOf(columnName)}`;
        
        if (!existingFieldKeys.has(fieldKey)) {
          data.fields.push({
            id: nanoid(),
            categoryId,
            name: columnName,
            key: fieldKey,
            type: 'string'
          });
        }
      });
    }

    // Prepare duplicate config
    const dupCfg = getDuplicateConfig();
    const dupFields: string[] = (dupCfg && dupCfg.fields) ? dupCfg.fields : [];

    function normalizeValue(v: any) {
      if (v === null || v === undefined) return '';
      return String(v).trim().toLowerCase();
    }

    const itemsToAdd: any[] = [];
    for (const row of rows) {
      const mappedRow: any = { id: nanoid(), categoryId };

      // Apply column mapping or use direct mapping
      Object.entries(row).forEach(([key, value]) => {
        const targetKey = columnMapping[key] || slugifyKey(key) || key;
        if (value !== undefined && value !== null && value !== '') {
          mappedRow[targetKey] = value;
        }
      });

      // If duplicate detection configured, check against existing items
      let skip = false;
      if (dupFields && dupFields.length > 0) {
        const signature = dupFields.map(f => normalizeValue(mappedRow[f] || '')).join('||');
        const nonEmpty = signature.replace(/\|\|/g, '');
        if (nonEmpty.length > 0) {
          const matches = data.items.filter(it => {
            const sig = dupFields.map(f => normalizeValue(it[f] || '')).join('||');
            return sig === signature;
          });

          if (matches.length > 0) {
            // Ask user whether to continue adding this item
            const vals = dupFields.map(f => `${f}: ${mappedRow[f] || '-'}`).join('\n');
            const ids = matches.map(m => m.id).join(', ');
            const confirmMsg = `Possível duplicado encontrado (${matches.length}): IDs existentes: ${ids}\n${vals}\n\nDeseja adicionar este item mesmo assim?`;
            const go = typeof window !== 'undefined' ? window.confirm(confirmMsg) : true;
            if (!go) {
              skip = true;
            }
          }
        }
      }

      if (!skip) itemsToAdd.push(mappedRow);
    }

    // Push accepted items
    itemsToAdd.forEach(it => data.items.push(it));

    saveData(data);
    showToast.success(`${rows.length} itens importados com sucesso${createNewCategory ? ` na nova categoria "${newCategoryName}"` : ''}!`, { autoClose: 4000 });
    setFile(null);
    setShowModal(false);
    setIsImporting(false);
    setPreviewData(null);
    setColumnMapping({});
    setNewCategoryName('');
    setCreateNewCategory(false);
    setShowMapping(false);
    setAutoCreateFields(true);
    window.location.reload(); // Recarrega para mostrar nova categoria
  };

  const categories = getInitialData().categories;

  if (!mounted) return (
    <button
      onClick={() => setShowModal(true)}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <span>Importar Arquivo (CSV, XLSX)</span>
    </button>
  );

  const modalContent = showModal && (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={() => setShowModal(false)}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-2xl font-bold mb-2">Importar Dados</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Selecione um arquivo e configure a importação
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* File Selection */}
              {!previewData && (
                <div>
                  <label className="block w-full">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-4">
                        <svg className="w-16 h-16 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="text-center">
                          <p className="text-lg font-medium mb-2">
                            {file ? file.name : 'Clique ou arraste um arquivo'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Arquivos CSV, XLSX ou XLS
                          </p>
                                  {xlsxWarningVisible && (
                                    <div className="mt-3 p-3 rounded border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-200">
                                      <div className="font-semibold">Aviso de segurança sobre .xlsx</div>
                                      <div className="mt-1">A biblioteca usada para ler arquivos Excel possui vulnerabilidades conhecidas (prototype pollution / ReDoS). Apenas prossiga se confiar no arquivo. Você pode converter as sheets para CSV e importar separadamente se preferir.</div>
                                      <label className="mt-2 flex items-center gap-2">
                                        <input type="checkbox" checked={xlsxAcknowledged} onChange={(e) => setXlsxAcknowledged(e.target.checked)} />
                                        <span>Entendo o risco e desejo processar este arquivo</span>
                                      </label>
                                      <div className="mt-3 flex gap-2">
                                        <button disabled={!xlsxAcknowledged} onClick={() => parsePendingXlsx(file)} className="btn btn-primary">Prosseguir e analisar sheets</button>
                                        <button onClick={() => { setXlsxWarningVisible(false); setFile(null); }} className="btn btn-ghost">Cancelar</button>
                                      </div>
                                    </div>
                                  )}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              )}

                      {/* Multi-sheet review UI (quando disponível) */}
                      {multiSheets && (
                        <div className="space-y-4">
                          <h4 className="font-semibold">Planilhas encontradas</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Revise cada sheet e escolha para qual categoria importá-la. Edite nomes antes de criar.</p>
                          <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-3 rounded">
                            <label className="flex items-center gap-3">
                              <input type="checkbox" checked={autoCreateFields} onChange={(e) => setAutoCreateFields(e.target.checked)} className="w-5 h-5" />
                              <div>
                                <div className="font-semibold">Criar campos automaticamente</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Cria campos na categoria a partir dos cabeçalhos de cada sheet quando for importada.</div>
                              </div>
                            </label>
                          </div>
                          {multiSheets.map((sheet) => (
                            <div key={sheet.name} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{sheet.name}</div>
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" checked={!!sheetOptions[sheet.name]?.import} onChange={(e) => setSheetOptions({...sheetOptions, [sheet.name]: {...sheetOptions[sheet.name], import: e.target.checked}})} />
                                  <span className="text-sm">Importar</span>
                                </label>
                              </div>
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm">Destino</label>
                                  <div className="mt-2 flex gap-2">
                                    <select value={sheetOptions[sheet.name]?.existingCategoryId || ''} onChange={(e) => setSheetOptions({...sheetOptions, [sheet.name]: {...sheetOptions[sheet.name], existingCategoryId: e.target.value, createNew: e.target.value ? false : sheetOptions[sheet.name].createNew}})} className="flex-1 px-3 py-2 border rounded">
                                      <option value="">-- Escolher categoria existente --</option>
                                      {getInitialData().categories.map((c:any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                    </select>
                                    <div className="flex-1">
                                      <input type="text" value={sheetOptions[sheet.name]?.newName || ''} onChange={(e) => setSheetOptions({...sheetOptions, [sheet.name]: {...sheetOptions[sheet.name], newName: e.target.value, createNew: true}})} className="w-full px-3 py-2 border rounded" />
                                      <div className="text-xs text-gray-500">(Nome da nova categoria — padrão: nome da sheet)</div>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm">Pré-visualização</label>
                                  <div className="mt-2 table-container max-h-48 overflow-auto border rounded p-2 bg-gray-50 dark:bg-gray-800">
                                    <table className="text-sm w-full">
                                      <thead>
                                        <tr>
                                          {Object.keys(sheet.preview[0] || {}).map((k:any) => <th key={k} className="px-2 py-1 text-left">{k}</th>)}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sheet.preview.map((r:any, i:number) => (
                                          <tr key={i}>{Object.values(r).map((v:any,j:number) => <td key={j} className="px-2 py-1">{String(v)}</td>)}</tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

              {previewData && (
                <>
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  📁 Para onde vão os dados?
                </label>
                
                <div className="space-y-3">
                  {/* Opção: Categoria Existente */}
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    !createNewCategory ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`} onClick={() => setCreateNewCategory(false)}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={!createNewCategory}
                        onChange={() => setCreateNewCategory(false)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">Categoria Existente</span>
                    </div>
                    {!createNewCategory && (
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-2"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Opção: Nova Categoria */}
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    createNewCategory ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                  }`} onClick={() => setCreateNewCategory(true)}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={createNewCategory}
                        onChange={() => setCreateNewCategory(true)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">➕ Criar Nova Categoria</span>
                    </div>
                    {createNewCategory && (
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Ex: Tablets, Impressoras, Televisões..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-2"
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Auto-create Fields Option */}
              {(selectedCategory || createNewCategory) && (
                <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="autoCreateFields"
                      checked={autoCreateFields}
                      onChange={(e) => setAutoCreateFields(e.target.checked)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <label htmlFor="autoCreateFields" className="font-semibold cursor-pointer flex items-center gap-2">
                        ⚡ Criar campos automaticamente
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">RECOMENDADO</span>
                      </label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        As colunas da planilha ({Object.keys(previewData[0] || {}).join(', ')}) serão criadas como campos na categoria automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Mapping */}
              {!autoCreateFields && selectedCategory && (
                <div>
                  <button
                    onClick={() => setShowMapping(!showMapping)}
                    className="btn btn-ghost mb-3"
                  >
                    {showMapping ? '▼' : '▶'} Mapeamento Avançado de Colunas
                  </button>
                  
                  {showMapping && (() => {
                    const data = getInitialData();
                    const categoryFields = data.fields.filter(f => f.categoryId === selectedCategory);
                    const columns = Object.keys(previewData[0] || {});
                    
                    return (
                      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Conecte as colunas da planilha com os campos da categoria:
                        </p>
                        {columns.map(column => (
                          <div key={column} className="flex items-center gap-3">
                            <div className="flex-1 font-medium">{column}</div>
                            <span>→</span>
                            <select
                              value={columnMapping[column] || ''}
                              onChange={(e) => setColumnMapping({...columnMapping, [column]: e.target.value})}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            >
                              <option value="">Usar nome da coluna</option>
                              {categoryFields.map(field => (
                                <option key={field.id} value={field.key}>{field.name} ({field.key})</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Preview Table */}
              <div>
                <h4 className="font-semibold mb-3">Pré-visualização ({previewData.length} primeiras linhas)</h4>
                <div className="table-container max-h-64 overflow-auto">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        {Object.keys(previewData[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="px-3 py-2">{String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
              )}
            </div>

            {previewData && (
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setFile(null);
                  setPreviewData(null);
                }}
                className="btn btn-ghost"
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || (!selectedCategory && !createNewCategory) || (createNewCategory && !newCategoryName.trim())}
                className="btn btn-primary"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    {createNewCategory ? '✓ Criar e Importar' : '✓ Confirmar Importação'}
                  </>
                )}
              </button>
            </div>
            )}
            {multiSheets && (
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setFile(null);
                  setMultiSheets(null);
                }}
                className="btn btn-ghost"
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="btn btn-primary"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Importando...
                  </>
                ) : (
                  <>✓ Importar Selecionadas</>
                )}
              </button>
            </div>
            )}
          </div>
        </div>
      </>
    );

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span>Importar Arquivo (CSV, XLSX)</span>
      </button>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
