-- Add is_system flag to position_todo_templates
ALTER TABLE position_todo_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Seed system templates (hotel_id = null means global)
INSERT INTO position_todo_templates (hotel_id, name, description, department, assigned_position, is_system, is_active)
VALUES
  (NULL, 'Bank Count Sheet', 'Count your cash drawer at shift start/end. Report cash, card, room charges, and discrepancies.', 'front_desk', '', true, true),
  (NULL, 'Room Moves Log', 'Record guest room changes — from room, to room, reason, and who initiated it.', 'front_desk', '', true, true),
  (NULL, 'No Shows Log', 'Track guests who did not arrive for their reservation.', 'front_desk', '', true, true)
ON CONFLICT DO NOTHING;

-- Get the IDs of the system templates we just inserted
DO $$
DECLARE
  bank_id UUID;
  room_moves_id UUID;
  no_shows_id UUID;
BEGIN
  SELECT id INTO bank_id FROM position_todo_templates WHERE name = 'Bank Count Sheet' AND is_system = true LIMIT 1;
  SELECT id INTO room_moves_id FROM position_todo_templates WHERE name = 'Room Moves Log' AND is_system = true LIMIT 1;
  SELECT id INTO no_shows_id FROM position_todo_templates WHERE name = 'No Shows Log' AND is_system = true LIMIT 1;

  -- Bank Count Sheet items
  INSERT INTO position_todo_items (template_id, label, item_type, required, sort_order, config) VALUES
    (bank_id, 'Shift', 'text', true, 0, '{"placeholder": "AM / PM"}'),
    (bank_id, 'Counted By', 'text', true, 1, '{"placeholder": "Your name"}'),
    (bank_id, 'Cash Total ($)', 'number', true, 2, '{"unit": "$", "placeholder": "0.00"}'),
    (bank_id, 'Card Total ($)', 'number', true, 3, '{"unit": "$", "placeholder": "0.00"}'),
    (bank_id, 'Room Charges ($)', 'number', false, 4, '{"unit": "$", "placeholder": "0.00"}'),
    (bank_id, 'Discrepancies', 'text', false, 5, '{"placeholder": "e.g. Cash +$5.00"}'),
    (bank_id, 'Notes', 'text', false, 6, '{"placeholder": "Any additional notes..."}')
  ON CONFLICT DO NOTHING;

  -- Room Moves Log items
  INSERT INTO position_todo_items (template_id, label, item_type, required, sort_order, config) VALUES
    (room_moves_id, 'Guest Name', 'text', true, 0, '{"placeholder": "Full name"}'),
    (room_moves_id, 'From Room', 'text', true, 1, '{"placeholder": "e.g. 204"}'),
    (room_moves_id, 'To Room', 'text', true, 2, '{"placeholder": "e.g. 312"}'),
    (room_moves_id, 'Reason', 'text', false, 3, '{"placeholder": "e.g. Maintenance, Upgrade, Guest request"}'),
    (room_moves_id, 'Initiated By', 'text', false, 4, '{"placeholder": "Staff name"}'),
    (room_moves_id, 'Notes', 'text', false, 5, '{"placeholder": "Additional details..."}')
  ON CONFLICT DO NOTHING;

  -- No Shows Log items
  INSERT INTO position_todo_items (template_id, label, item_type, required, sort_order, config) VALUES
    (no_shows_id, 'Guest Name', 'text', true, 0, '{"placeholder": "Full name"}'),
    (no_shows_id, 'Room', 'text', true, 1, '{"placeholder": "e.g. 205"}'),
    (no_shows_id, 'Reservation Ref', 'text', false, 2, '{"placeholder": "Confirmation number"}'),
    (no_shows_id, 'Reason', 'text', false, 3, '{"placeholder": "e.g. Late arrival, Cancelled"}'),
    (no_shows_id, 'Notes', 'text', false, 4, '{"placeholder": "Additional details..."}')
  ON CONFLICT DO NOTHING;
END $$;
