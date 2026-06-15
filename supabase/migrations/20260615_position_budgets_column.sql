-- Add position_budgets JSONB column to hotels table
-- This stores the configurable Position Budget Model for each position
-- Structure: [{ position: string, title: string, modelType: 'per-room'|'shifts'|'fixed', budgetType: 'weekly'|'daily', shiftsPerDay: number, hoursPerShift: number, minutesPerCheckout: number, minutesPerStayover: number, budgetHours: number }]

ALTER TABLE hotels 
ADD COLUMN IF NOT EXISTS position_budgets JSONB 
NOT NULL DEFAULT '[]'::jsonb;