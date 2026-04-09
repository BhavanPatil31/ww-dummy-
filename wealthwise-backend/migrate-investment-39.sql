-- Manual Migration Script: Move Investment ID 39 to Tax Transactions
-- This script moves an existing investment with an endDate to the tax_transactions table

-- Step 1: Insert the investment into tax_transactions
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
    COALESCE(i.scheme_name, CONCAT('Fund #', i.fund_id)) as fund_name,
    COALESCE(i.buy_date, COALESCE(i.start_date, CURDATE())) as buy_date,
    i.end_date as sell_date,
    COALESCE(i.units, 0) as units,
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
WHERE i.id = 39;

-- Step 2: Delete the investment from investments table
DELETE FROM investments WHERE id = 39;

-- Verification: Check if migration was successful
SELECT 'Tax Transactions for this fund:' as info;
SELECT * FROM tax_transactions WHERE fund_name LIKE '%SBI Comma%' ORDER BY sell_date DESC;

SELECT 'Investment table check (should be empty for this fund):' as info;
SELECT * FROM investments WHERE id = 39;
