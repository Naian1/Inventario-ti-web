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

export type Item = {
  id: string;
  categoryId: string;
  [key: string]: any;
};

export type InventoryData = {
  categories: Category[];
  fields: Field[];
  items: Item[];
  activities?: Activity[];
  duplicateConfig?: DuplicateConfig;
  users: { username: string; role: 'admin' | 'user' }[];
};

export type Activity = {
  id: string;
  type: 'info' | 'import' | 'create' | 'update' | 'delete' | 'warning';
  title: string;
  description?: string;
  time: string; // ISO timestamp
};

export type DuplicateConfig = {
  fields: string[]; // keys to check for duplicates across categories
};
