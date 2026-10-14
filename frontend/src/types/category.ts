export interface CommonCategory {
  id: number;
  type: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface CategoryTypeInfo {
  type: string;
  label: string;
  count: number;
}

export interface CreateCategoryPayload {
  type: string;
  code: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export interface UpdateCategoryPayload {
  type: string;
  code: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export interface CategoryFilterParams {
  search?: string;
  type?: string;
  active?: boolean;
}

export interface CategoryReorderItem {
  id: number;
  sortOrder: number;
}

export interface CategoryReorderPayload {
  items: CategoryReorderItem[];
}

