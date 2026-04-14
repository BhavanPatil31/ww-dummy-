-- Enforce 1 investment -> 1 goal mapping in goal_investments.
-- Clean duplicates first (keep smallest goal_investment_id per investment_id).
DELETE gi1
FROM goal_investments gi1
JOIN goal_investments gi2
  ON gi1.investment_id = gi2.investment_id
 AND gi1.goal_investment_id > gi2.goal_investment_id;

-- Enforce uniqueness at DB level.
ALTER TABLE goal_investments
ADD CONSTRAINT uq_goal_investments_investment_id UNIQUE (investment_id);
