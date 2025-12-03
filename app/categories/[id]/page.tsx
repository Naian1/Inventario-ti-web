'use client';
import { useEffect, useState, useMemo, use } from 'react';
import { getInitialData, saveData, getDuplicateConfig, addMovement } from '@/lib/localStorage';
import type { Category, Item, Field, ItemStatus } from '@/lib/types';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { nanoid } from 'nanoid';
import { showToast } from '@/lib/toast';
import { DuplicateConfirmModal } from '@/components/DuplicateConfirmModal';
import { MoveItemModal } from '@/components/MoveItemModal';
import ReturnItemModal from '@/components/ReturnItemModal';

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingDuplicates, setPendingDuplicates] = useState<Array<{field: string; value: string; matches: any[]}>>([]);
  const [pendingItem, setPendingItem] = useState<Item | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<Item | null>(null);
  const [moveTargetStatus, setMoveTargetStatus] = useState<ItemStatus | null>(null);
  const [showChangedFieldsModal, setShowChangedFieldsModal] = useState(false);
  const [changedFieldsData, setChangedFieldsData] = useState<{oldItem: Item; newItem: Item; changedFields: string[]}>({ oldItem: {} as Item, newItem: {} as Item, changedFields: [] });

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    console.log('🔔 Modal state changed:', { 
      showDuplicateModal, 
      hasDuplicates: pendingDuplicates.length > 0,
      hasItem: !!pendingItem 
    });
  }, [showDuplicateModal, pendingDuplicates, pendingItem]);

  const loadData = () => {
    const data = getInitialData();
    const cat = data.categories.find((c) => c.id === id);
    if (cat) {
      setCategory(cat);
      const categoryItems = data.items.filter((i) => i.categoryId === id);
      setItems(categoryItems);
      
      // Get fields from category definition
      const categoryFields = data.fields.filter((f) => f.categoryId === id);
      if (categoryFields.length > 0) {
        setFields(categoryFields);
      } else {
        // Fallback: Extract unique field keys from items
        const fieldSet = new Set<string>();
        categoryItems.forEach((item) => {
          Object.keys(item).forEach((key) => {
            if (key !== 'id' && key !== 'categoryId') {
              fieldSet.add(key);
            }
          });
        });
        setFields(Array.from(fieldSet).map(key => ({ 
          id: key, 
          categoryId: id, 
          key, 
          name: key, 
          type: 'string' as const 
        })));
      }
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply column filters
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter(item => {
        return Object.entries(columnFilters).every(([field, filterValue]) => {
          if (!filterValue.trim()) return true;
          const itemValue = String(item[field] || '').toLowerCase();
          return itemValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '').toLowerCase();
        const bVal = String(b[sortConfig.key] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, columnFilters, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleColumnFilter = (field: string, value: string) => {
    setColumnFilters(prev => {
      if (!value.trim()) {
        const newFilters = { ...prev };
        delete newFilters[field];
        return newFilters;
      }
      return { ...prev, [field]: value };
    });
  };

  const saveItem = async () => {
    if (!editingItem) return;
    
    const data = getInitialData();
    const itemIndex = data.items.findIndex((i) => i.id === editingItem.id);
    if (itemIndex === -1) return;

    const originalItem = data.items[itemIndex];
    
    // Detectar campos que foram alterados
    const changedFields: string[] = [];
    Object.keys(editingItem).forEach(key => {
      if (key !== 'id' && key !== 'categoryId' && key !== 'status') {
        const oldValue = originalItem[key];
        const newValue = editingItem[key];
        if (oldValue && oldValue !== newValue) {
          changedFields.push(key);
        }
      }
    });

    // Se há campos alterados, perguntar o que fazer com os valores antigos
    if (changedFields.length > 0) {
      setChangedFieldsData({
        oldItem: originalItem,
        newItem: editingItem,
        changedFields
      });
      setShowChangedFieldsModal(true);
      return; // Aguardar decisão do usuário
    }

    // Se não há alterações significativas, salvar direto
    proceedWithSave(editingItem, false, null);
  };

  const proceedWithSave = async (itemToSave: Item, moveOldValues: boolean, targetStatus: ItemStatus | null) => {
    const data = getInitialData();
    const itemIndex = data.items.findIndex((i) => i.id === itemToSave.id);
    if (itemIndex === -1) return;

    const originalItem = data.items[itemIndex];

    // Se usuário escolheu mover valores antigos
    if (moveOldValues && targetStatus && changedFieldsData.changedFields.length > 0) {
      const specialCategoryId = targetStatus === 'stock' ? 'STOCK_CATEGORY' : 'MAINTENANCE_CATEGORY';
      const specialCategoryName = targetStatus === 'stock' ? 'Estoque' : 'Manutenção';
      
      // Criar categoria especial se não existir
      if (!data.categories.find(c => c.id === specialCategoryId)) {
        data.categories.push({
          id: specialCategoryId,
          name: specialCategoryName
        });
      }
      
      // Criar novo item com valores antigos
      const newItemWithOldValues: Item = {
        id: nanoid(),
        categoryId: specialCategoryId,
        status: targetStatus
      };
      
      changedFieldsData.changedFields.forEach(field => {
        newItemWithOldValues[field] = originalItem[field];
      });
      
      data.items.push(newItemWithOldValues);
      
      // Registrar movimentação
      addMovement({
        itemId: newItemWithOldValues.id,
        action: 'field_split',
        reason: targetStatus === 'stock' ? 'to_stock' : 'to_maintenance',
        reasonText: `Valores antigos movidos durante edição: ${changedFieldsData.changedFields.join(', ')}`,
        fromCategory: id,
        toCategory: specialCategoryId,
        selectedFields: changedFieldsData.changedFields,
        changedFields: changedFieldsData.changedFields.map(field => ({
          field,
          oldValue: originalItem[field],
          newValue: originalItem[field]
        }))
      });
      
      showToast.success(`Valores antigos movidos para ${specialCategoryName}`, { autoClose: 3000 });
    }

    // Atualizar item
    data.items[itemIndex] = itemToSave;
    saveData(data);
    setEditingItem(null);
    setShowChangedFieldsModal(false);
    loadData();
    showToast.success('Item atualizado com sucesso!', { autoClose: 2000 });
    
    try {
      const { addActivity } = await import('@/lib/localStorage');
      const itemName = Object.entries(itemToSave).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item';
      const category = data.categories.find(c => c.id === id);
      addActivity({ 
        type: 'update', 
        title: 'Item atualizado', 
        description: `Item atualizado na categoria ${category?.name || id}`,
        itemId: itemToSave.id,
        itemName: itemName,
        categoryId: id,
        categoryName: category?.name
      });
    } catch (e) {}
  };

  const saveItemOld = async () => {
    if (!editingItem) return;
    
    const data = getInitialData();
    const itemIndex = data.items.findIndex((i) => i.id === editingItem.id);
    if (itemIndex === -1) return;

    // Verificar duplicados antes de salvar (igual ao addNewItem)
    const dupCfg = getDuplicateConfig();
    const dupFields = dupCfg && dupCfg.fields ? dupCfg.fields : [];
    
    function normalizeValue(v: any) {
      if (v === null || v === undefined) return '';
      return String(v).trim().toLowerCase();
    }

    if (dupFields && dupFields.length > 0) {
      console.log('🔍 Verificando duplicados ao editar item:');
      console.log('  - Campos configurados:', dupFields);
      console.log('  - Item sendo editado:', editingItem);
      
      const duplicatesByField: Array<{ field: string; value: string; matches: any[] }> = [];
      
      dupFields.forEach(field => {
        const newValue = editingItem[field];
        if (newValue !== undefined && newValue !== null) {
          const normalized = normalizeValue(newValue);
          if (normalized.length > 0) {
            console.log(`  - Verificando campo "${field}" com valor "${newValue}"`);
            
            // Buscar duplicados EXCETO o próprio item sendo editado
            const matches = data.items.filter(existingItem => {
              if (existingItem.id === editingItem.id) return false; // Ignorar o próprio item
              
              const existingValue = existingItem[field];
              if (existingValue === undefined || existingValue === null) return false;
              const existingNormalized = normalizeValue(existingValue);
              const isMatch = existingNormalized === normalized;
              
              if (isMatch) {
                console.log(`    ✅ Match encontrado! Item ${existingItem.id} tem ${field}="${existingValue}"`);
              }
              return isMatch;
            });
            
            if (matches.length > 0) {
              console.log(`  ⚠️ Campo "${field}" duplicado! ${matches.length} item(ns) encontrado(s)`);
              duplicatesByField.push({ field, value: String(newValue), matches });
            } else {
              console.log(`  ✓ Campo "${field}" único (sem duplicados)`);
            }
          }
        }
      });
      
      if (duplicatesByField.length > 0) {
        console.log(`  ⚠️ Total de campos duplicados: ${duplicatesByField.length}`);
        console.log('  📢 Mostrando modal de confirmação ao editar...');
        
        // Mostrar modal de confirmação
        setPendingDuplicates(duplicatesByField);
        setPendingItem(editingItem);
        setShowDuplicateModal(true);
        return; // Interromper aqui, usuário precisa confirmar
      } else {
        console.log('  ✓ Nenhum campo duplicado encontrado - item único!');
      }
    }

    // Se não há duplicados ou usuário confirmou, salvar
    data.items[itemIndex] = editingItem;
    saveData(data);
    setEditingItem(null);
    loadData();
    showToast.success('Item atualizado com sucesso!', { autoClose: 2000 });
    
    try {
      const { addActivity } = await import('@/lib/localStorage');
      const itemName = Object.entries(editingItem).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item';
      const category = data.categories.find(c => c.id === id);
      addActivity({ 
        type: 'update', 
        title: 'Item atualizado', 
        description: `Item atualizado na categoria ${category?.name || id}`,
        itemId: editingItem.id,
        itemName: itemName,
        categoryId: id,
        categoryName: category?.name
      });
    } catch (e) {}
  };

  const deleteItem = (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?\n\nEsta ação não pode ser desfeita.')) return;
    
    const data = getInitialData();
    data.items = data.items.filter((i) => i.id !== itemId);
    saveData(data);
    loadData();
    showToast.success('Item excluído com sucesso!', { autoClose: 2000 });
  };

  const quickChangeStatus = (item: Item, newStatus: ItemStatus) => {
    // Abrir modal para selecionar quais campos mover
    setSelectedItemForAction(item);
    setMoveTargetStatus(newStatus);
    setShowMoveModal(true);
  };

  const confirmMoveItem = (data: {
    targetCategoryId: string;
    selectedFields: string[];
    reason: any;
    reasonText: string;
    newStatus?: ItemStatus;
  }) => {
    const storageData = getInitialData();
    const itemIndex = storageData.items.findIndex(i => i.id === selectedItemForAction!.id);
    if (itemIndex === -1) return;

    const originalItem = storageData.items[itemIndex];
    const oldStatus = originalItem.status || 'active';
    const oldCategoryId = originalItem.categoryId;
    const newStatus = data.newStatus || moveTargetStatus || 'active';
    
    // Criar categoria especial se não existir
    const specialCategoryId = newStatus === 'stock' ? 'STOCK_CATEGORY' : 'MAINTENANCE_CATEGORY';
    const specialCategoryName = newStatus === 'stock' ? 'Estoque' : 'Manutenção';
    
    if (!storageData.categories.find(c => c.id === specialCategoryId)) {
      storageData.categories.push({
        id: specialCategoryId,
        name: specialCategoryName
      });
    }
    
    // CRIAR NOVO ITEM na categoria de destino com APENAS os campos selecionados
    const newItemForDestination: Item = {
      id: nanoid(),
      categoryId: specialCategoryId,
      status: newStatus
    };
    
    data.selectedFields.forEach(field => {
      newItemForDestination[field] = originalItem[field];
    });
    
    storageData.items.push(newItemForDestination);
    
    // LIMPAR os campos selecionados do item original (deixar vazios para adicionar novos equipamentos)
    data.selectedFields.forEach(field => {
      storageData.items[itemIndex][field] = null;
    });
    
    // Atualizar status do item original se todos os campos foram movidos
    const remainingFields = Object.keys(originalItem).filter(
      k => k !== 'id' && k !== 'categoryId' && k !== 'status' && originalItem[k] && !data.selectedFields.includes(k)
    );
    
    if (remainingFields.length === 0) {
      // Se não sobrou nenhum campo preenchido, remover o item original
      storageData.items = storageData.items.filter(i => i.id !== originalItem.id);
      showToast.info('Item original removido (todos os campos foram movidos)', { autoClose: 3000 });
    }
    
    saveData(storageData);

    // Registrar movimentação
    addMovement({
      itemId: newItemForDestination.id,
      action: 'field_split',
      reason: data.reason,
      reasonText: data.reasonText || `Campos movidos: ${data.selectedFields.join(', ')}`,
      fromCategory: oldCategoryId,
      toCategory: specialCategoryId,
      selectedFields: data.selectedFields,
      changedFields: data.selectedFields.map(field => ({
        field,
        oldValue: originalItem[field],
        newValue: originalItem[field]
      }))
    });

    loadData();
    setShowMoveModal(false);
    setSelectedItemForAction(null);
    setMoveTargetStatus(null);
    
    const statusNames: Record<ItemStatus, string> = {
      active: 'Ativo',
      stock: 'Estoque',
      maintenance: 'Manutenção',
      condemned: 'Condenado',
      returned: 'Devolvido'
    };
    
    showToast.success(`${data.selectedFields.length} campo(s) movido(s) para ${statusNames[newStatus]}`, { autoClose: 3000 });
    showToast.info('Campos movidos ficaram vazios no item original', { autoClose: 3000 });
  };

  const openMoveModal = (item: Item) => {
    setSelectedItemForAction(item);
    setShowMoveModal(true);
  };

  const openReturnModal = (item: Item) => {
    setSelectedItemForAction(item);
    setShowReturnModal(true);
  };

  const openAddItemModal = () => {
    const initialItem: Record<string, any> = {};
    fields.forEach(field => {
      initialItem[field.key] = '';
    });
    setNewItem(initialItem);
    setAddingItem(true);
  };

  const confirmAddDuplicate = async () => {
    if (!pendingItem) return;
    
    const data = getInitialData();
    
    // Verificar se é uma edição (item já existe) ou adição (novo item)
    const existingItemIndex = data.items.findIndex(i => i.id === pendingItem.id);
    const isEdit = existingItemIndex !== -1;
    
    if (isEdit) {
      console.log('  ✅ Usuário confirmou edição apesar dos duplicados');
      // Atualizar item existente
      data.items[existingItemIndex] = pendingItem;
      showToast.success('Item atualizado com sucesso!', { autoClose: 2000 });
      showToast.info('Item atualizado mesmo com duplicados detectados', { autoClose: 3000 });
      
      try {
        const { addActivity } = await import('@/lib/localStorage');
        const itemName = Object.entries(pendingItem).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item';
        const category = data.categories.find(c => c.id === id);
        addActivity({ 
          type: 'update', 
          title: 'Item atualizado', 
          description: `Item atualizado na categoria ${category?.name || id}`,
          itemId: pendingItem.id,
          itemName: itemName,
          categoryId: id,
          categoryName: category?.name
        });
      } catch (e) {}
      
      setEditingItem(null);
    } else {
      console.log('  ✅ Usuário confirmou adição apesar dos duplicados');
      // Adicionar novo item
      data.items.push(pendingItem);
      showToast.success('Item adicionado com sucesso!', { autoClose: 2000 });
      showToast.info('Item adicionado mesmo com duplicados detectados', { autoClose: 3000 });
      
      try {
        const { addActivity } = await import('@/lib/localStorage');
        const itemName = Object.entries(pendingItem).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item';
        const category = data.categories.find(c => c.id === id);
        addActivity({ 
          type: 'create', 
          title: 'Item criado', 
          description: `Novo item adicionado na categoria ${category?.name || id}`,
          itemId: pendingItem.id,
          itemName: itemName,
          categoryId: id,
          categoryName: category?.name
        });
      } catch (e) {}
      
      setAddingItem(false);
      setNewItem({});
    }
    
    saveData(data);
    setShowDuplicateModal(false);
    setPendingDuplicates([]);
    setPendingItem(null);
    loadData();
  };

  const cancelAddDuplicate = () => {
    console.log('  ❌ Usuário cancelou operação');
    
    // Verificar se era uma edição para não fechar o modal de edição
    const data = getInitialData();
    const wasEdit = pendingItem && data.items.some(i => i.id === pendingItem.id);
    
    setShowDuplicateModal(false);
    setPendingDuplicates([]);
    setPendingItem(null);
    
    if (wasEdit) {
      showToast.warning('Alterações não foram salvas', { autoClose: 2500 });
      // Manter o modal de edição aberto
    } else {
      showToast.warning('Item não foi adicionado', { autoClose: 2500 });
    }
  };

  const addNewItem = async () => {
    const data = getInitialData();
    const item: Item = {
      id: nanoid(),
      categoryId: id,
      ...newItem
    };

    // Duplicate check based on configured fields
    const dupCfg = getDuplicateConfig();
    const dupFields = dupCfg && dupCfg.fields ? dupCfg.fields : [];
    function normalizeValue(v: any) {
      if (v === null || v === undefined) return '';
      return String(v).trim().toLowerCase();
    }

    let skipAdd = false;
    if (dupFields && dupFields.length > 0) {
      console.log('🔍 Verificando duplicados ao adicionar item:');
      console.log('  - Campos configurados:', dupFields);
      console.log('  - Item sendo adicionado:', item);
      console.log('  - Total de items no inventário:', data.items.length);
      
      // Nova abordagem: verificar CADA campo individualmente
      const duplicatesByField: Array<{ field: string; value: string; matches: any[] }> = [];
      
      dupFields.forEach(field => {
        const newValue = item[field];
        if (newValue !== undefined && newValue !== null) {
          const normalized = normalizeValue(newValue);
          if (normalized.length > 0) {
            console.log(`  - Verificando campo "${field}" com valor "${newValue}" (normalizado: "${normalized}")`);
            
            const matches = data.items.filter(existingItem => {
              const existingValue = existingItem[field];
              if (existingValue === undefined || existingValue === null) return false;
              const existingNormalized = normalizeValue(existingValue);
              const isMatch = existingNormalized === normalized;
              if (isMatch) {
                console.log(`    ✅ Match encontrado! Item ${existingItem.id} tem ${field}="${existingValue}"`);
              }
              return isMatch;
            });
            
            if (matches.length > 0) {
              console.log(`  ⚠️ Campo "${field}" duplicado! ${matches.length} item(ns) encontrado(s)`);
              duplicatesByField.push({ field, value: String(newValue), matches });
            } else {
              console.log(`  ✓ Campo "${field}" único (sem duplicados)`);
            }
          }
        }
      });
      
      if (duplicatesByField.length > 0) {
        console.log(`  ⚠️ Total de campos duplicados: ${duplicatesByField.length}`);
        console.log('  📢 Mostrando modal de confirmação...');
        console.log('  📝 Duplicados:', duplicatesByField);
        
        // Mostrar modal de confirmação em vez de window.confirm()
        setPendingDuplicates(duplicatesByField);
        setPendingItem(item);
        setShowDuplicateModal(true);
        
        console.log('  ✅ States atualizados:', { 
          showModal: true, 
          duplicatesCount: duplicatesByField.length,
          itemId: item.id 
        });
        return; // Interromper aqui, continua no callback do modal
      } else {
        console.log('  ✓ Nenhum campo duplicado encontrado - item único!');
      }
    } else {
      console.log('  ℹ️ Nenhum campo configurado para detecção de duplicados');
    }

    if (skipAdd) {
      // user cancelled adding due to duplicate
      return;
    }

    data.items.push(item);
    saveData(data);
    setAddingItem(false);
    setNewItem({});
    loadData();
    showToast.success('Item adicionado com sucesso!', { autoClose: 2000 });
    
    try {
      const { addActivity } = await import('@/lib/localStorage');
      const itemName = Object.entries(item).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item';
      const category = data.categories.find(c => c.id === id);
      addActivity({ 
        type: 'create', 
        title: 'Item criado', 
        description: `Novo item adicionado na categoria ${category?.name || id}`,
        itemId: item.id,
        itemName: itemName,
        categoryId: id,
        categoryName: category?.name
      });
    } catch (e) {}
  };

  if (!category) {
    return (
      <Layout>
        <div className="content">
          <div className="panel">
            <h2 className="text-xl font-semibold mb-4">Categoria não encontrada</h2>
            <Link href="/painel" className="text-blue-600 hover:underline">
              Voltar ao Painel
            </Link>
        </div>
      </div>

      {/* Modal de confirmação de duplicados */}
      {showDuplicateModal && pendingDuplicates.length > 0 && (
        <DuplicateConfirmModal
          duplicates={pendingDuplicates}
          categories={getInitialData().categories}
          onConfirm={confirmAddDuplicate}
          onCancel={cancelAddDuplicate}
        />
      )}
    </Layout>
  );
}  return (
    <Layout>
      <div className="content">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'itens'}
              {filteredAndSortedItems.length !== items.length && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (filtrado de {items.length})
                </span>
              )}
            </p>
          </div>
          <Link
            href="/painel"
            className="btn btn-ghost"
          >
            ← Voltar
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="panel text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nenhum item nesta categoria ainda
            </p>
            <button onClick={openAddItemModal} className="btn btn-primary">
              + Adicionar Item
            </button>
          </div>
        ) : (
          <div className="panel">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {Object.keys(columnFilters).length > 0 && (
                  <button
                    onClick={() => setColumnFilters({})}
                    className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    🗑️ Limpar Filtros
                  </button>
                )}
                {sortConfig && (
                  <button
                    onClick={() => setSortConfig(null)}
                    className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    ↕️ Remover Ordenação
                  </button>
                )}
              </div>
              <button onClick={openAddItemModal} className="btn btn-primary">
                + Adicionar Item
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {fields.map((field) => (
                      <th key={field.key} className="relative group">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSort(field.key)}
                            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span>{field.name}</span>
                            {sortConfig?.key === field.key && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                            {!sortConfig || sortConfig.key !== field.key && (
                              <span className="opacity-0 group-hover:opacity-50 text-xs">↕️</span>
                            )}
                          </button>
                          <input
                            type="text"
                            value={columnFilters[field.key] || ''}
                            onChange={(e) => handleColumnFilter(field.key, e.target.value)}
                            placeholder={`Filtrar ${field.name}...`}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                    ))}
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={fields.length + 1} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {Object.keys(columnFilters).length > 0 ? (
                          <>Nenhum item encontrado com os filtros aplicados</>
                        ) : (
                          <>Nenhum item nesta categoria</>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedItems.map((item) => (
                      <tr key={item.id}>
                        {fields.map((field, idx) => (
                          <td key={field.key}>
                            {idx === 0 && (
                              <div className="flex items-center gap-2">
                                {/* Badge de status */}
                                {item.status === 'stock' && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full" title="Em Estoque"></span>
                                )}
                                {item.status === 'maintenance' && (
                                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Em Manutenção"></span>
                                )}
                                {item.status === 'condemned' && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full" title="Condenado"></span>
                                )}
                                {item.status === 'returned' && (
                                  <span className="w-2 h-2 bg-gray-500 rounded-full" title="Devolvido"></span>
                                )}
                                {(!item.status || item.status === 'active') && (
                                  <span className="w-2 h-2 bg-green-500 rounded-full" title="Ativo"></span>
                                )}
                                <span>{item[field.key] || '-'}</span>
                              </div>
                            )}
                            {idx !== 0 && (item[field.key] || '-')}
                          </td>
                        ))}
                        <td>
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 text-sm font-medium"
                              title="Editar item"
                            >
                              Editar
                            </button>
                            
                            {/* Botões de status rápido */}
                            {item.status !== 'stock' && (
                              <button 
                                onClick={() => quickChangeStatus(item, 'stock')}
                                className="text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 text-sm font-medium"
                                title="Mover para Estoque"
                              >
                                Estoque
                              </button>
                            )}
                            
                            {item.status !== 'maintenance' && (
                              <button 
                                onClick={() => quickChangeStatus(item, 'maintenance')}
                                className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-400 text-sm font-medium"
                                title="Enviar para Manutenção"
                              >
                                Manutenção
                              </button>
                            )}
                            
                            {item.status !== 'active' && (
                              <button 
                                onClick={() => quickChangeStatus(item, 'active')}
                                className="text-green-600 hover:text-green-800 dark:hover:text-green-400 text-sm font-medium"
                                title="Marcar como Ativo"
                              >
                                Ativar
                              </button>
                            )}
                            
                            <button 
                              onClick={() => openMoveModal(item)}
                              className="text-purple-600 hover:text-purple-800 dark:hover:text-purple-400 text-sm font-medium"
                              title="Movimentar com detalhes"
                            >
                              Movimentar
                            </button>
                            
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
                              title="Excluir item"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-bold">Editar Item</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.name}</label>
                    <input
                      type="text"
                      value={editingItem[field.key] || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                <button onClick={() => setEditingItem(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button onClick={saveItem} className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {addingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-bold">Adicionar Novo Item</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.name}</label>
                    <input
                      type="text"
                      value={newItem[field.key] || ''}
                      onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setAddingItem(false); setNewItem({}); }} className="btn btn-ghost">
                  Cancelar
                </button>
                <button onClick={addNewItem} className="btn btn-primary">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação de duplicados */}
        <DuplicateConfirmModal
          duplicates={pendingDuplicates}
          categories={getInitialData().categories}
          onConfirm={confirmAddDuplicate}
          onCancel={cancelAddDuplicate}
          isOpen={showDuplicateModal && pendingDuplicates.length > 0}
        />

        {/* Modal de Campos Alterados */}
        {showChangedFieldsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 animate-scale-in">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  O que fazer com os valores antigos?
                </h2>
                <p className="text-white/90 text-sm mt-2">
                  Você alterou {changedFieldsData.changedFields.length} campo(s). O que deseja fazer com os valores anteriores?
                </p>
              </div>

              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Campos alterados:</h3>
                  <div className="space-y-2">
                    {changedFieldsData.changedFields.map(field => (
                      <div key={field} className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{field}:</span>
                        <span className="ml-2 text-red-600 line-through">{changedFieldsData.oldItem[field]}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-semibold">{changedFieldsData.newItem[field]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => proceedWithSave(changedFieldsData.newItem, true, 'stock')}
                    className="w-full p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                        <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Mover para Estoque</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Criar um novo item no estoque com os valores antigos</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => proceedWithSave(changedFieldsData.newItem, true, 'maintenance')}
                    className="w-full p-4 border-2 border-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Mover para Manutenção</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Enviar valores antigos para manutenção (equipamento com defeito)</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => proceedWithSave(changedFieldsData.newItem, false, null)}
                    className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Estava Errado Mesmo</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Descartar valores antigos (apenas atualizar o item)</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                <button
                  onClick={() => {
                    setShowChangedFieldsModal(false);
                    setEditingItem(null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar Edição
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Movimentação */}
        {showMoveModal && selectedItemForAction && (
          <MoveItemModal
            item={selectedItemForAction}
            currentCategory={category!}
            allCategories={[{ id: moveTargetStatus === 'stock' ? 'STOCK_CATEGORY' : 'MAINTENANCE_CATEGORY', name: moveTargetStatus === 'stock' ? 'Estoque' : 'Manutenção' }]}
            allFields={fields}
            onConfirm={confirmMoveItem}
            onCancel={() => {
              setShowMoveModal(false);
              setSelectedItemForAction(null);
              setMoveTargetStatus(null);
            }}
          />
        )}

        {/* Modal de Devolução */}
        {showReturnModal && selectedItemForAction && (
          <ReturnItemModal
            isOpen={showReturnModal}
            onClose={() => {
              setShowReturnModal(false);
              setSelectedItemForAction(null);
            }}
            onConfirm={(returnData) => {
              // TODO: Implementar lógica de devolução
              console.log('Return data:', returnData);
              setShowReturnModal(false);
              setSelectedItemForAction(null);
              showToast.info('Devolução será implementada em breve', { autoClose: 2000 });
            }}
            itemName={Object.entries(selectedItemForAction).find(([key]) => key !== 'id' && key !== 'categoryId' && key !== 'status')?.[1] as string || 'Item'}
          />
        )}
      </div>
    </Layout>
  );
}
