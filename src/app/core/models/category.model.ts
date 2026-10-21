export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  isNecessary: boolean;
}
