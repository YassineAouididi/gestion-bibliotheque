export interface Publisher {
  id: string;
  label: string;
  created_at: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  genre: string;
  price: number;
  page_count: number;
  available: boolean;
  retired: boolean;
  last_borrowed_at: string | null;
  created_at: string;
  book_publishers?: { publisher: Publisher }[];
}

export interface Subscriber {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  gender: 'M' | 'F' | 'Autre';
  phone: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  year: number;
  base_price: number;
  final_price: number;
  discount_applied: boolean;
  created_at: string;
  subscriber?: Subscriber;
}

export type BorrowCondition = 'bon' | 'use' | 'completement_use';
export type BorrowStatus = 'en_cours' | 'rendu';

export interface Borrowing {
  id: string;
  subscriber_id: string;
  book_id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  condition: BorrowCondition | null;
  late_penalty: number;
  condition_penalty: number;
  status: BorrowStatus;
  created_at: string;
  subscriber?: Subscriber;
  book?: Book;
}

export type Page =
  | 'dashboard'
  | 'books'
  | 'publishers'
  | 'subscribers'
  | 'subscriptions'
  | 'borrowings';
