/*
# Bibliothèque — Schéma complet

## Description
Création du schéma de base de données pour le système de gestion de bibliothèque.
Application mono-tenant sans authentification (usage interne bibliothécaire).

## Nouvelles tables

### publishers
Éditeurs de livres.
- id (uuid, PK)
- label (text, libellé de l'éditeur)

### books
Livres disponibles dans la bibliothèque.
- id (uuid, PK)
- isbn (text, unique)
- title (text)
- genre (text)
- price (numeric)
- page_count (integer)
- available (boolean, true si non emprunté)
- retired (boolean, vrai si retiré)
- last_borrowed_at (timestamptz, dernière date d'emprunt)

### book_publishers
Table de liaison livres ↔ éditeurs (many-to-many).

### subscribers
Abonnés de la bibliothèque.
- id (uuid, PK)
- first_name, last_name (text)
- email (text, unique)
- age (integer)
- gender (text: M/F/Autre)
- phone (text)

### subscriptions
Abonnements annuels des abonnés.
- id (uuid, PK)
- subscriber_id (FK → subscribers)
- year (integer)
- base_price (numeric, prix normal)
- final_price (numeric, prix après remise éventuelle)
- discount_applied (boolean)
- UNIQUE (subscriber_id, year)

### borrowings
Emprunts de livres.
- id (uuid, PK)
- subscriber_id (FK → subscribers)
- book_id (FK → books)
- borrow_date (date)
- due_date (date, calculée automatiquement: +7j si <300p, +15j sinon)
- return_date (date, null si en cours)
- condition (text: bon/use/completement_use)
- late_penalty (numeric)
- condition_penalty (numeric)
- status (text: en_cours/rendu)

## Sécurité
- RLS activé sur toutes les tables
- Politiques CRUD pour anon + authenticated (app interne, pas d'isolation utilisateur)
*/

-- Publishers
CREATE TABLE IF NOT EXISTS publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Books
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn text UNIQUE NOT NULL,
  title text NOT NULL,
  genre text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  page_count integer NOT NULL CHECK (page_count > 0),
  available boolean NOT NULL DEFAULT true,
  retired boolean NOT NULL DEFAULT false,
  last_borrowed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Book ↔ Publisher junction
CREATE TABLE IF NOT EXISTS book_publishers (
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  publisher_id uuid REFERENCES publishers(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, publisher_id)
);

-- Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  age integer NOT NULL CHECK (age >= 0),
  gender text NOT NULL CHECK (gender IN ('M', 'F', 'Autre')),
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  year integer NOT NULL,
  base_price numeric(10,2) NOT NULL DEFAULT 50.00,
  final_price numeric(10,2) NOT NULL DEFAULT 50.00,
  discount_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (subscriber_id, year)
);

-- Borrowings
CREATE TABLE IF NOT EXISTS borrowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  borrow_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  return_date date,
  condition text CHECK (condition IN ('bon', 'use', 'completement_use')),
  late_penalty numeric(10,2) NOT NULL DEFAULT 0,
  condition_penalty numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'rendu')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_borrowings_subscriber ON borrowings(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_book ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_book_publishers_book ON book_publishers(book_id);
CREATE INDEX IF NOT EXISTS idx_book_publishers_publisher ON book_publishers(publisher_id);

-- RLS
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowings ENABLE ROW LEVEL SECURITY;

-- publishers
DROP POLICY IF EXISTS "anon_select_publishers" ON publishers;
CREATE POLICY "anon_select_publishers" ON publishers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_publishers" ON publishers;
CREATE POLICY "anon_insert_publishers" ON publishers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_publishers" ON publishers;
CREATE POLICY "anon_update_publishers" ON publishers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_publishers" ON publishers;
CREATE POLICY "anon_delete_publishers" ON publishers FOR DELETE TO anon, authenticated USING (true);

-- books
DROP POLICY IF EXISTS "anon_select_books" ON books;
CREATE POLICY "anon_select_books" ON books FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_books" ON books;
CREATE POLICY "anon_insert_books" ON books FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_books" ON books;
CREATE POLICY "anon_update_books" ON books FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_books" ON books;
CREATE POLICY "anon_delete_books" ON books FOR DELETE TO anon, authenticated USING (true);

-- book_publishers
DROP POLICY IF EXISTS "anon_select_book_publishers" ON book_publishers;
CREATE POLICY "anon_select_book_publishers" ON book_publishers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_book_publishers" ON book_publishers;
CREATE POLICY "anon_insert_book_publishers" ON book_publishers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_book_publishers" ON book_publishers;
CREATE POLICY "anon_update_book_publishers" ON book_publishers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_book_publishers" ON book_publishers;
CREATE POLICY "anon_delete_book_publishers" ON book_publishers FOR DELETE TO anon, authenticated USING (true);

-- subscribers
DROP POLICY IF EXISTS "anon_select_subscribers" ON subscribers;
CREATE POLICY "anon_select_subscribers" ON subscribers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subscribers" ON subscribers;
CREATE POLICY "anon_insert_subscribers" ON subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subscribers" ON subscribers;
CREATE POLICY "anon_update_subscribers" ON subscribers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subscribers" ON subscribers;
CREATE POLICY "anon_delete_subscribers" ON subscribers FOR DELETE TO anon, authenticated USING (true);

-- subscriptions
DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE TO anon, authenticated USING (true);

-- borrowings
DROP POLICY IF EXISTS "anon_select_borrowings" ON borrowings;
CREATE POLICY "anon_select_borrowings" ON borrowings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_borrowings" ON borrowings;
CREATE POLICY "anon_insert_borrowings" ON borrowings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_borrowings" ON borrowings;
CREATE POLICY "anon_update_borrowings" ON borrowings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_borrowings" ON borrowings;
CREATE POLICY "anon_delete_borrowings" ON borrowings FOR DELETE TO anon, authenticated USING (true);
