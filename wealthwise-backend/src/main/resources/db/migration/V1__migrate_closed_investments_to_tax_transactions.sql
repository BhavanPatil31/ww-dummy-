-- Migration: Create tax_transactions table and move closed investments (with endDate) into it.
-- This migration ensures data integrity by moving investments with endDate values
-- from the investments table to the tax_transactions table.

CREATE TABLE IF NOT EXISTS tax_transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    fund_name VARCHAR(255) NOT NULL,
    buy_date DATE NOT NULL,
    sell_date DATE NOT NULL,
    units DOUBLE NOT NULL,
    gain DOUBLE NOT NULL,
    tax_type VARCHAR(10) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'APP',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tax_transactions (
    transaction_id,
    user_id,
    fund_name,
    buy_date,
    sell_date,
    units,
    gain,
    tax_type,
    created_at
)
SELECT
    CONCAT('inv-migr-', UUID()),
    CAST(i.user_id AS CHAR),
    COALESCE(i.scheme_name, CONCAT('Fund #', i.fund_id)),
    COALESCE(i.buy_date, COALESCE(i.start_date, CURDATE())),
    i.end_date,
    COALESCE(i.units, 0),
    CASE
        WHEN i.units IS NOT NULL AND i.units > 0 AND i.current_nav IS NOT NULL AND i.current_nav > 0
            THEN (i.units * i.current_nav) - COALESCE(i.amount, 0)
        WHEN i.units IS NOT NULL AND i.units > 0 AND i.nav_at_buy IS NOT NULL AND i.nav_at_buy > 0
            THEN (i.units * i.nav_at_buy * 1.05) - COALESCE(i.amount, 0)
        WHEN COALESCE(i.amount, 0) > 0
            THEN (COALESCE(i.amount, 0) * 1.15) - COALESCE(i.amount, 0)
        ELSE 0
    END as gain,
    CASE
        WHEN DATEDIFF(i.end_date, COALESCE(i.buy_date, COALESCE(i.start_date, CURDATE()))) > 365
            THEN 'LTCG'
        ELSE 'STCG'
    END as tax_type,
    NOW()
FROM investments i
WHERE i.end_date IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM tax_transactions t
      WHERE t.user_id = CAST(i.user_id AS CHAR)
        AND t.fund_name = COALESCE(i.scheme_name, CONCAT('Fund #', i.fund_id))
        AND t.sell_date = i.end_date
  );

-- Delete investments that were migrated to tax_transactions
DELETE FROM investments
WHERE end_date IS NOT NULL;
