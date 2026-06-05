/*
# Restrict all tables to authenticated users only

## Description
Now that the app has a sign-in flow, every RLS policy is updated from
`TO anon, authenticated` to `TO authenticated` only. Unauthenticated
(anonymous) requests are blocked on all tables.

## Tables affected
publishers, books, book_publishers, subscribers, subscriptions, borrowings

## Security changes
- All SELECT / INSERT / UPDATE / DELETE policies now require an active
  Supabase session (authenticated role).
- The anon role has no access to any table.
*/

-- publishers
DROP POLICY IF EXISTS "anon_select_publishers" ON publishers;
DROP POLICY IF EXISTS "anon_insert_publishers" ON publishers;
DROP POLICY IF EXISTS "anon_update_publishers" ON publishers;
DROP POLICY IF EXISTS "anon_delete_publishers" ON publishers;

CREATE POLICY "auth_select_publishers" ON publishers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_publishers" ON publishers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_publishers" ON publishers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_publishers" ON publishers FOR DELETE TO authenticated USING (true);

-- books
DROP POLICY IF EXISTS "anon_select_books" ON books;
DROP POLICY IF EXISTS "anon_insert_books" ON books;
DROP POLICY IF EXISTS "anon_update_books" ON books;
DROP POLICY IF EXISTS "anon_delete_books" ON books;

CREATE POLICY "auth_select_books" ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_books" ON books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_books" ON books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_books" ON books FOR DELETE TO authenticated USING (true);

-- book_publishers
DROP POLICY IF EXISTS "anon_select_book_publishers" ON book_publishers;
DROP POLICY IF EXISTS "anon_insert_book_publishers" ON book_publishers;
DROP POLICY IF EXISTS "anon_update_book_publishers" ON book_publishers;
DROP POLICY IF EXISTS "anon_delete_book_publishers" ON book_publishers;

CREATE POLICY "auth_select_book_publishers" ON book_publishers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_book_publishers" ON book_publishers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_book_publishers" ON book_publishers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_book_publishers" ON book_publishers FOR DELETE TO authenticated USING (true);

-- subscribers
DROP POLICY IF EXISTS "anon_select_subscribers" ON subscribers;
DROP POLICY IF EXISTS "anon_insert_subscribers" ON subscribers;
DROP POLICY IF EXISTS "anon_update_subscribers" ON subscribers;
DROP POLICY IF EXISTS "anon_delete_subscribers" ON subscribers;

CREATE POLICY "auth_select_subscribers" ON subscribers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_subscribers" ON subscribers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_subscribers" ON subscribers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_subscribers" ON subscribers FOR DELETE TO authenticated USING (true);

-- subscriptions
DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;

CREATE POLICY "auth_select_subscriptions" ON subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_subscriptions" ON subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_subscriptions" ON subscriptions FOR DELETE TO authenticated USING (true);

-- borrowings
DROP POLICY IF EXISTS "anon_select_borrowings" ON borrowings;
DROP POLICY IF EXISTS "anon_insert_borrowings" ON borrowings;
DROP POLICY IF EXISTS "anon_update_borrowings" ON borrowings;
DROP POLICY IF EXISTS "anon_delete_borrowings" ON borrowings;

CREATE POLICY "auth_select_borrowings" ON borrowings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_borrowings" ON borrowings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_borrowings" ON borrowings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_borrowings" ON borrowings FOR DELETE TO authenticated USING (true);
