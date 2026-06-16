-- Ensure client_admin and super_admin can read their own venue's data
-- Reviews
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_select_reviews' AND tablename = 'reviews'
  ) THEN
    CREATE POLICY "admin_select_reviews" ON reviews
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('client_admin', 'super_admin')
            AND (profiles.venue_id = reviews.venue_id OR profiles.role = 'super_admin')
        )
      );
  END IF;
END $$;

-- Spins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_select_spins' AND tablename = 'spins'
  ) THEN
    CREATE POLICY "admin_select_spins" ON spins
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('client_admin', 'super_admin')
            AND (profiles.venue_id = spins.venue_id OR profiles.role = 'super_admin')
        )
      );
  END IF;
END $$;

-- Vouchers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_select_vouchers' AND tablename = 'vouchers'
  ) THEN
    CREATE POLICY "admin_select_vouchers" ON vouchers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('client_admin', 'super_admin')
            AND (profiles.venue_id = vouchers.venue_id OR profiles.role = 'super_admin')
        )
      );
  END IF;
END $$;

-- Review answers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_select_review_answers' AND tablename = 'review_answers'
  ) THEN
    CREATE POLICY "admin_select_review_answers" ON review_answers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('client_admin', 'super_admin')
            AND (profiles.venue_id = review_answers.venue_id OR profiles.role = 'super_admin')
        )
      );
  END IF;
END $$;
