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

ALTER TABLE tax_transactions
ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'APP';

