export type Field = {
  id: string;
  categoryId: string;
  name: string;
  key: string;
  type: 'string' | 'number' | 'boolean';
};

export type Category = {
  id: string;
  name: string;
};

export type ItemStatus = 
  | 'active'          // Em uso ativo
  | 'stock'           // No estoque
  | 'maintenance'     // Em manutenção
  | 'condemned'       // Condenado (não funciona mais)
  | 'returned';       // Devolvido ao fornecedor

export type MovementReason = 
  | 'correction'      // Correção de dados
  | 'transfer'        // Transferência entre categorias
  | 'to_stock'        // Movido para estoque
  | 'to_maintenance'  // Enviado para manutenção
  | 'from_stock'      // Retornou do estoque
  | 'from_maintenance'// Retornou da manutenção
  | 'condemned'       // Marcado como condenado
  | 'returned'        // Devolvido ao fornecedor
  | 'other';          // Outro motivo

export type MovementHistory = {
  id: string;
  itemId: string;
  timestamp: string; // ISO timestamp
  userName: string;
  action: 'create' | 'edit' | 'transfer' | 'status_change' | 'delete' | 'return';
  reason: MovementReason;
  reasonText?: string; // Texto livre para detalhes
  fromCategory?: string; // ID da categoria de origem
  toCategory?: string;   // ID da categoria de destino
  changedFields: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  selectedFields?: string[]; // Campos que foram copiados na transferência
};

export type ReturnRecord = {
  id: string;
  itemId: string;
  itemName: string; // Nome/identificação do item
  timestamp: string; // Data da devolução
  userName: string;
  returnReason: 'warranty' | 'irreparable' | 'replacement' | 'other';
  returnReasonText: string;
  returnedTo: string; // Fornecedor/Fabricante
  invoiceNumber?: string; // Número da nota fiscal de devolução
  invoiceDate?: string; // Data da nota fiscal
  invoiceAttachment?: string; // URL/Base64 do anexo da NF
  estimatedValue?: number; // Valor estimado do item
  notes?: string; // Observações adicionais
};

export type Item = {
  id: string;
  categoryId: string;
  status?: ItemStatus; // Padrão: 'active'
  [key: string]: any;
};

export type InventoryData = {
  categories: Category[];
  fields: Field[];
  items: Item[];
  activities?: Activity[];
  movementHistory?: MovementHistory[];
  returnRecords?: ReturnRecord[];
  duplicateConfig?: DuplicateConfig;
  users: { username: string; role: 'admin' | 'user' }[];
};

export type Activity = {
  id: string;
  type: 'info' | 'import' | 'create' | 'update' | 'delete' | 'warning';
  title: string;
  description?: string;
  time: string; // ISO timestamp
  itemId?: string; // ID do item relacionado
  itemName?: string; // Nome/identificador principal do item
  categoryId?: string; // ID da categoria
  categoryName?: string; // Nome da categoria
};

export type DuplicateConfig = {
  fields: string[]; // keys to check for duplicates across categories
};

export interface ReturnItem {
  id: string;
  patrimonio: string;
  modelo: string;
  marca: string;
}

export interface Return {
  id: string;
  numeroNota: string;
  data: string;
  itens: ReturnItem[];
  pdfUrl?: string; // base64 encoded PDF
  pdfName?: string;
  observacoes?: string;
  status: 'pendente' | 'processada' | 'cancelada';
  criadoPor?: string;
  criadoEm: string;
}
