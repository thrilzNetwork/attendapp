/* eslint-disable */
// opsStore.ts — typed store for staff operations data
// We use the `requests` table as a typed JSONB store because RLS is open
// and the new tables (staff_schedules, staff_checklists, etc.) have no policies.
//
// Every record is a row in `requests` with:
//   type: one of the literals in OpRecordType
//   details: JSONB blob holding the typed payload
//   status: lifecycle (active / pending / completed / archived)
//   guest_name: 'STAFF' for admin-created, or the staff member name
//   room: 'STAFF' for internal records
//
// This is intentionally pragmatic — once the SQL migrations are applied,
// swap these helpers for the real table reads.

import { supabase } from './supabase';

export type DepartmentKey =
  | 'management'
  | 'front_desk'
  | 'housekeeping'
  | 'maintenance'
  | 'security'
  | 'drivers';

export const DEPARTMENTS: { key: DepartmentKey; label: string; icon: string }[] = [
  { key: 'management', label: 'Management', icon: '👔' },
  { key: 'front_desk', label: 'Front Desk', icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { key: 'security', label: 'Security', icon: '🛡️' },
  { key: 'drivers', label: 'Drivers', icon: '🚐' },
];

export type OpRecordType =
  | 'kpi_definition'         // admin-defined KPI
  | 'kpi_submission'         // staff-entered value
  | 'checklist_template'     // admin template per position
  | 'checklist_completion'   // staff check-off
  | 'forecast'               // admin occupancy/coverage forecast
  | 'generated_shift'        // system-generated shift from forecast
  | 'shift_submission'       // admin manually posted shift
  | 'schedule_change_request'// staff request to change a shift
  | 'learning_content'       // HR/learning material
  | 'hr_document'            // HR document
  | 'shuttle_config'         // hotel's free-shuttle config + recurring slots
  | 'shuttle_slot'           // single shuttle time slot (Sun–Sat × time)
  | 'shuttle_booking'        // guest booking
  | 'call_around_log'        // daily call-around entry
  | 'incident_log'           // bad feedback / incident
  | 'kb_suggestion';         // AI-suggested KB entry from incident

export interface OpRecord {
  id: string;
  hotel_id: string;
  type: OpRecordType;
  details: any;
  status: string;
  guest_name?: string;
  room?: string;
  created_at: string;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// =====================================================================
// Generic CRUD on the `requests` table filtered by `type`
// =====================================================================

export async function listOps(
  hotelId: string,
  type: OpRecordType,
  opts: { since?: string; status?: string } = {}
): Promise<OpRecord[]> {
  let q = supabase
    .from('requests')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('type', type)
    .order('created_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.since) q = q.gte('created_at', opts.since);
  const { data, error } = await q;
  if (error) {
    console.warn(`listOps(${type}) error:`, error.message);
    return [];
  }
  return (data || []).map(parseDetails);
}

export async function createOps(
  hotelId: string,
  type: OpRecordType,
  details: any,
  status = 'active',
  meta: { guest_name?: string; room?: string } = {}
): Promise<OpRecord | null> {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      hotel_id: hotelId,
      type,
      details: JSON.stringify(details),
      status,
      guest_name: meta.guest_name || 'STAFF',
      room: meta.room || 'STAFF',
    })
    .select()
    .single();
  if (error) {
    console.error(`createOps(${type}) error:`, error.message);
    return null;
  }
  return parseDetails(data);
}

export async function updateOps(
  id: string,
  patch: { status?: string; details?: any }
): Promise<boolean> {
  const body: any = {};
  if (patch.status) body.status = patch.status;
  if (patch.details) body.details = JSON.stringify(patch.details);
  const { error } = await supabase
    .from('requests')
    .update(body)
    .eq('id', id);
  if (error) {
    console.error('updateOps error:', error.message);
    return false;
  }
  return true;
}

export async function deleteOps(id: string): Promise<boolean> {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) {
    console.error('deleteOps error:', error.message);
    return false;
  }
  return true;
}

function parseDetails(row: any): OpRecord {
  let d = row.details;
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch { d = {}; }
  }
  return { ...row, details: d };
}

// =====================================================================
// KPI definitions + submissions
// =====================================================================

export interface KpiDefinition {
  kpi_name: string;
  unit: string;          // '$', '%', 'count', 'minutes', etc
  target: number;        // daily target
  frequency: 'daily' | 'weekly' | 'monthly';
  category: string;      // 'Revenue', 'Operations', 'Guest Experience', etc
}

export interface KpiSubmission {
  definition_id: string;
  kpi_name: string;
  value: number;
  shift_date: string;    // YYYY-MM-DD
  submitted_by: string;  // staff name
  notes?: string;
}

export async function listKpiDefinitions(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'kpi_definition', { status: 'active' });
}

export async function createKpiDefinition(
  hotelId: string,
  def: KpiDefinition
): Promise<OpRecord | null> {
  return createOps(hotelId, 'kpi_definition', def, 'active');
}

export async function deleteKpiDefinition(id: string): Promise<boolean> {
  return deleteOps(id);
}

export async function listKpiSubmissions(
  hotelId: string,
  shiftDate?: string
): Promise<OpRecord[]> {
  return listOps(hotelId, 'kpi_submission', {
    status: 'active',
    since: shiftDate ? `${shiftDate}T00:00:00` : undefined,
  });
}

export async function createKpiSubmission(
  hotelId: string,
  sub: KpiSubmission
): Promise<OpRecord | null> {
  return createOps(
    hotelId,
    'kpi_submission',
    sub,
    'active',
    { guest_name: sub.submitted_by, room: 'KPI' }
  );
}

// =====================================================================
// Checklist templates + completions
// =====================================================================

export interface ChecklistTemplate {
  title: string;
  position: string;      // 'Front Desk', 'Housekeeping', 'Night Audit', 'Maintenance', 'Security', 'Drivers', etc
  department: DepartmentKey;
  items: string[];       // ['Check voicemail', 'Restock towels', ...]
  shift: 'opening' | 'mid' | 'closing' | 'overnight' | 'any';
  estimated_minutes?: number;
}

export interface ChecklistCompletion {
  template_id: string;
  template_title: string;
  position: string;
  shift_date: string;
  completed_items: string[];   // indices of items completed
  total_items: number;
  completed_by: string;
  notes?: string;
}

export async function listChecklistTemplates(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'checklist_template', { status: 'active' });
}

export async function createChecklistTemplate(
  hotelId: string,
  t: ChecklistTemplate
): Promise<OpRecord | null> {
  return createOps(hotelId, 'checklist_template', t, 'active');
}

export async function deleteChecklistTemplate(id: string): Promise<boolean> {
  return deleteOps(id);
}

export async function listChecklistCompletions(
  hotelId: string,
  shiftDate?: string
): Promise<OpRecord[]> {
  return listOps(hotelId, 'checklist_completion', {
    status: 'active',
    since: shiftDate ? `${shiftDate}T00:00:00` : undefined,
  });
}

export async function createChecklistCompletion(
  hotelId: string,
  c: ChecklistCompletion
): Promise<OpRecord | null> {
  return createOps(
    hotelId,
    'checklist_completion',
    c,
    'active',
    { guest_name: c.completed_by, room: 'CHECKLIST' }
  );
}

export async function updateChecklistCompletion(
  id: string,
  patch: { details?: any; status?: string }
): Promise<boolean> {
  return updateOps(id, patch);
}

// =====================================================================
// Forecasts + generated shifts
// =====================================================================

export interface Forecast {
  forecast_date: string;     // YYYY-MM-DD the forecast is for
  expected_occupancy: number; // rooms sold
  coverage_rules: CoverageRule[]; // per-department
  notes?: string;
  created_by: string;
}

export interface CoverageRule {
  department: DepartmentKey;
  position: string;          // 'Front Desk', 'Housekeeping', etc
  ratio: number;             // e.g. 1 per 30 rooms
  min_staff: number;         // floor
  max_staff: number;         // ceiling
  start_time: string;        // '07:00'
  end_time: string;          // '15:00'
}

export interface GeneratedShift {
  forecast_id?: string;      // link back to forecast
  shift_date: string;
  department: DepartmentKey;
  position: string;
  start_time: string;
  end_time: string;
  staff_count: number;
  status: 'draft' | 'approved' | 'filled';
  notes?: string;
  created_by: string;
}

export async function listForecasts(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'forecast', { status: 'active' });
}

export async function createForecast(hotelId: string, f: Forecast): Promise<OpRecord | null> {
  return createOps(
    hotelId,
    'forecast',
    f,
    'active',
    { guest_name: f.created_by, room: 'FORECAST' }
  );
}

export async function listShifts(
  hotelId: string,
  shiftDate?: string
): Promise<OpRecord[]> {
  // Both 'generated_shift' (from forecast) and 'shift_submission' (manual)
  const a = await listOps(hotelId, 'generated_shift', { status: 'active' });
  const b = await listOps(hotelId, 'shift_submission', { status: 'active' });
  const all = [...a, ...b];
  if (shiftDate) {
    return all.filter((r) => (r.details as any).shift_date === shiftDate);
  }
  return all;
}

export async function createGeneratedShift(
  hotelId: string,
  s: GeneratedShift
): Promise<OpRecord | null> {
  return createOps(
    hotelId,
    'generated_shift',
    s,
    s.status || 'draft',
    { guest_name: s.created_by, room: 'SHIFT' }
  );
}

export async function updateShift(id: string, patch: { details?: any; status?: string }): Promise<boolean> {
  return updateOps(id, patch);
}

export async function deleteShift(id: string): Promise<boolean> {
  return deleteOps(id);
}

// =====================================================================
// Learning + HR
// =====================================================================

export interface LearningContent {
  title: string;
  category: 'Training' | 'Policy' | 'Brand Standards' | 'Safety' | 'Upselling';
  body: string;
  estimated_minutes?: number;
  required_for?: string[];  // positions
}

export interface HrDocument {
  title: string;
  category: 'Benefits' | 'Payroll' | 'Handbook' | 'Forms' | 'Contact';
  body: string;
  url?: string;
}

export async function listLearningContent(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'learning_content', { status: 'active' });
}

export async function createLearningContent(
  hotelId: string,
  c: LearningContent
): Promise<OpRecord | null> {
  return createOps(hotelId, 'learning_content', c, 'active');
}

export async function deleteLearningContent(id: string): Promise<boolean> {
  return deleteOps(id);
}

export async function listHrDocuments(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'hr_document', { status: 'active' });
}

export async function createHrDocument(
  hotelId: string,
  d: HrDocument
): Promise<OpRecord | null> {
  return createOps(hotelId, 'hr_document', d, 'active');
}

export async function deleteHrDocument(id: string): Promise<boolean> {
  return deleteOps(id);
}

// =====================================================================
// Schedule change requests (staff -> admin)
// =====================================================================

export interface ScheduleChangeRequest {
  requested_by: string;     // staff name
  shift_date: string;
  department: DepartmentKey;
  change_type: 'swap' | 'cover' | 'time_change' | 'time_off' | 'other';
  details: string;
}

export async function listScheduleChangeRequests(
  hotelId: string,
  status: string = 'pending'
): Promise<OpRecord[]> {
  return listOps(hotelId, 'schedule_change_request', { status });
}

export async function createScheduleChangeRequest(
  hotelId: string,
  r: ScheduleChangeRequest
): Promise<OpRecord | null> {
  return createOps(
    hotelId,
    'schedule_change_request',
    r,
    'pending',
    { guest_name: r.requested_by, room: 'STAFF' }
  );
}

// =====================================================================
// Forecast → shift generator (pure function)
// =====================================================================

export function generateShiftsFromForecast(forecast: Forecast): GeneratedShift[] {
  const shifts: GeneratedShift[] = [];
  for (const rule of forecast.coverage_rules) {
    const recommended = Math.max(
      rule.min_staff,
      Math.min(rule.max_staff, Math.ceil(forecast.expected_occupancy / Math.max(1, rule.ratio)))
    );
    shifts.push({
      forecast_id: undefined, // filled by caller
      shift_date: forecast.forecast_date,
      department: rule.department,
      position: rule.position,
      start_time: rule.start_time,
      end_time: rule.end_time,
      staff_count: recommended,
      status: 'draft',
      notes: `${recommended} × ${rule.position} for ${forecast.expected_occupancy} rooms (rule: 1 per ${rule.ratio})`,
      created_by: forecast.created_by,
    });
  }
  return shifts;
}

// =====================================================================
// Shuttle: free airport shuttle config + slot schedule
// =====================================================================

export interface ShuttleConfig {
  enabled: boolean;
  service_name: string;          // "Free Airport Shuttle"
  start_time: string;            // '06:00' — first slot of the day
  end_time: string;              // '22:00' — last slot of the day
  days: number[];                // [0,1,2,3,4,5,6] (Sun=0)
  capacity: number;              // per slot
  pickup_location: string;       // 'Terminal 1'
  notes: string;
  service_type?: 'regular' | 'express' | 'both';
}

export interface ShuttleSlot {
  day_of_week: number;           // 0=Sun..6=Sat
  departure_time: string;        // '06:00'
  pickup_location: string;
  destination?: string;          // optional alternate destination
  service_type: 'regular' | 'express';
  capacity: number;
  notes?: string;
}

export async function getShuttleConfig(hotelId: string): Promise<ShuttleConfig | null> {
  const recs = await listOps(hotelId, 'shuttle_config', { status: 'active' });
  if (!recs.length) return null;
  return recs[0].details as ShuttleConfig;
}

export async function saveShuttleConfig(hotelId: string, cfg: ShuttleConfig, author = 'Admin'): Promise<boolean> {
  // Replace any existing config (we treat the latest one as the source of truth)
  const existing = await listOps(hotelId, 'shuttle_config', { status: 'active' });
  for (const e of existing) await deleteOps(e.id);
  const res = await createOps(hotelId, 'shuttle_config', cfg, 'active', { guest_name: author, room: 'SHUTTLE' });
  return !!res;
}

export async function listShuttleSlots(hotelId: string): Promise<(ShuttleSlot & { id: string })[]> {
  const recs = await listOps(hotelId, 'shuttle_slot', { status: 'active' });
  return recs.map(r => ({ ...(r.details as ShuttleSlot), id: r.id }));
}

export async function saveShuttleSlots(
  hotelId: string,
  slots: ShuttleSlot[],
  author = 'Admin'
): Promise<boolean> {
  // Wipe existing slots, save new
  const existing = await listOps(hotelId, 'shuttle_slot', { status: 'active' });
  for (const e of existing) await deleteOps(e.id);
  for (const s of slots) {
    await createOps(hotelId, 'shuttle_slot', s, 'active', { guest_name: author, room: 'SHUTTLE' });
  }
  return true;
}

export async function deleteShuttleSlot(hotelId: string, id: string): Promise<boolean> {
  return deleteOps(id);
}

// =====================================================================
// Call-around log (front desk daily competitor / sister property check)
// =====================================================================

export interface CallAroundEntry {
  log_date: string;              // YYYY-MM-DD
  hotel_name: string;            // "Best Western Fort Lauderdale"
  phone: string;
  contact: string;               // who you spoke to (optional)
  occupancy: string;             // 'High' | 'Low' | 'Sold out' | numeric
  rate: string;                  // quoted rate
  notes: string;
  called_by: string;
}

export async function listCallAroundLogs(hotelId: string, sinceDate?: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'call_around_log', { since: sinceDate ? `${sinceDate}T00:00:00` : undefined });
}

export async function createCallAroundLog(
  hotelId: string,
  entry: CallAroundEntry
): Promise<OpRecord | null> {
  return createOps(hotelId, 'call_around_log', entry, 'active', { guest_name: entry.called_by, room: 'CALL' });
}

export async function deleteCallAroundLog(id: string): Promise<boolean> {
  return deleteOps(id);
}

// =====================================================================
// Incident log + KB suggestions
// =====================================================================

export interface IncidentLog {
  incident_date: string;
  category: 'Complaint' | 'Safety' | 'Maintenance' | 'Service' | 'Policy' | 'Other';
  severity: 'Low' | 'Medium' | 'High';
  raw_text: string;              // staff's freeform description
  ai_suggestion?: string;        // suggested response
  status: 'open' | 'reviewed' | 'resolved';
  reported_by: string;
}

export async function listIncidents(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'incident_log', { status: 'active' });
}

export async function createIncident(
  hotelId: string,
  i: IncidentLog
): Promise<OpRecord | null> {
  return createOps(hotelId, 'incident_log', i, 'active', { guest_name: i.reported_by, room: 'INCIDENT' });
}

export async function updateIncident(
  id: string,
  patch: { details?: any; status?: string }
): Promise<boolean> {
  return updateOps(id, patch);
}

export async function deleteIncident(id: string): Promise<boolean> {
  return deleteOps(id);
}

// KB suggestion = a learned response/sop that staff can reference later
export interface KbSuggestion {
  title: string;
  category: string;
  situation: string;              // the trigger / context
  response: string;              // what to do / say
  source_incident_id?: string;
  added_by: string;
}

export async function listKbSuggestions(hotelId: string): Promise<OpRecord[]> {
  return listOps(hotelId, 'kb_suggestion', { status: 'active' });
}

// New: list entries filtered by status — used for the approval flow
// Approved = 'active' (canonical KB), Pending = 'pending' (awaiting admin review)
export async function listKbSuggestionsByStatus(hotelId: string, status: 'pending' | 'active' | 'rejected'): Promise<OpRecord[]> {
  return listOps(hotelId, 'kb_suggestion', { status });
}

export async function createKbSuggestion(
  hotelId: string,
  k: KbSuggestion
): Promise<OpRecord | null> {
  return createOps(hotelId, 'kb_suggestion', k, 'active', { guest_name: k.added_by, room: 'KB' });
}

// New: create a KB suggestion that starts in 'pending' status — awaits admin approval
export async function createKbSuggestionPending(
  hotelId: string,
  k: KbSuggestion
): Promise<OpRecord | null> {
  return createOps(hotelId, 'kb_suggestion', k, 'pending', { guest_name: k.added_by, room: 'KB' });
}

export async function approveKbSuggestion(id: string): Promise<boolean> {
  return updateOps(id, { status: 'active' });
}

export async function rejectKbSuggestion(id: string): Promise<boolean> {
  return updateOps(id, { status: 'rejected' });
}

export async function deleteKbSuggestion(id: string): Promise<boolean> {
  return deleteOps(id);
}

// =====================================================================
// Local "AI" suggestion engine
// Pattern-matches the raw_text and returns a structured response + KB entry.
// This is intentionally local so it works without an external API.
// The logic: keyword detection → template response → optional KB entry
// =====================================================================

export interface AiSuggestionResult {
  category: IncidentLog['category'];
  severity: IncidentLog['severity'];
  response: string;              // what to say to the guest
  internal_action: string;       // what to do internally
  suggested_kb: {                // optional KB entry to save
    title: string;
    situation: string;
    response: string;
  };
}

export function suggestResponse(rawText: string, category?: IncidentLog['category']): AiSuggestionResult {
  const text = (rawText || '').toLowerCase();
  let detected = category || 'Other';
  let severity: IncidentLog['severity'] = 'Low';

  // Category detection
  if (/smoke|fire|carbon|monoxide|gas|leak|spill|injury|fall|emergency|police|ambulance/.test(text)) {
    detected = 'Safety';
    severity = 'High';
  } else if (/no.{0,5}(hot )?water|ac|air condition|heat|heater|electric|power|outage|breakfast|wi-?fi|elevator|broken|leak|drip/.test(text)) {
    detected = 'Maintenance';
    severity = /no.{0,5}(hot )?water|power|outage|elevator/.test(text) ? 'High' : 'Medium';
  } else if (/dirty|stain|hair|smell|odor|noise|loud|complain|disappoint|frustrat|angry|rude|unprofessional|wait|long|delay|slow/.test(text)) {
    detected = 'Complaint';
    severity = /unprofessional|rude|angry|frustrat/.test(text) ? 'Medium' : 'Low';
  } else if (/charge|refund|bill|invoice|overcharge|wrong|double|payment|credit card/.test(text)) {
    detected = 'Policy';
    severity = 'Medium';
  } else if (/service|forgot|didn.{0,3}t|left behind|towel|key|card|breakfast/.test(text)) {
    detected = 'Service';
  }

  // Templates per category
  const templates: Record<string, { response: string; internal: string; kbTitle: string }> = {
    Safety: {
      response:
        "I am so sorry to hear about this — your safety is our top priority. I am dispatching our team right now. Please stay where you are safe, and if this is a medical or police emergency, please call 911 immediately. I will personally follow up with you within the next 5 minutes.",
      internal:
        "1. Dispatch on-call manager + maintenance immediately. 2. Document with photos if safe. 3. Offer guest a room change + comp night if needed. 4. File incident report. 5. Follow up within 30 min.",
      kbTitle: "How to handle a guest safety incident",
    },
    Maintenance: {
      response:
        "I sincerely apologize for the inconvenience. Our maintenance team is on the way to your room right now. As a courtesy for the trouble, I would like to [offer a comp night / move you to a comparable room / discount your stay]. Is there anything else I can do to make this right?",
      internal:
        "1. Create work order with priority level. 2. ETA to guest within 15 min. 3. Offer room move if not fixable in 30 min. 4. Log incident for next-day follow-up. 5. Apply comp / discount per GM discretion.",
      kbTitle: "Maintenance issue — guest communication + resolution",
    },
    Complaint: {
      response:
        "Thank you for taking the time to tell me — I completely understand why this would be frustrating, and I am so sorry we fell short. I want to make this right for you. Here is what I am doing: [specific action]. Please let me know directly if there is anything else I can do — your comfort is what matters to me.",
      internal:
        "1. Listen without interrupting. 2. Empathize ('I understand why that would be frustrating'). 3. Offer a concrete remedy (room move, comp item, discount). 4. Document in guest profile. 5. Manager review if guest requests.",
      kbTitle: "Handling a guest complaint with empathy + action",
    },
    Policy: {
      response:
        "I hear you, and I am sorry the policy caused confusion. Let me walk you through exactly what happened and what I can do. [Explain policy + offer any available flexibility]. I want to find a fair solution for you.",
      internal:
        "1. Quote the exact policy wording. 2. Explain the reason for the policy. 3. Check if any exception applies (loyalty, length of stay, repeat guest). 4. Escalate to manager for refunds/credits. 5. Document for audit trail.",
      kbTitle: "When a guest challenges a policy — de-escalation playbook",
    },
    Service: {
      response:
        "I am so sorry — that is not the experience we want for you. Let me take care of this right now. [Specific action — bring towels, send fresh breakfast, etc.]. I will follow up in 15 minutes to make sure everything is to your satisfaction.",
      internal:
        "1. Acknowledge the miss without making excuses. 2. Solve the immediate need within 15 min. 3. Log in service-recovery tracker. 4. Brief the next shift. 5. Recognize the staff who made the error (private coaching, not public).",
      kbTitle: "Service recovery — what to do when we drop the ball",
    },
    Other: {
      response:
        "Thank you for letting me know. I want to make sure we handle this well. May I get a few more details so I can get you the right help? I will personally follow up with you.",
      internal:
        "1. Capture full details (who, what, when, where). 2. Identify the right team to handle. 3. Set a follow-up time with the guest. 4. Document in incident log. 5. Review patterns weekly.",
      kbTitle: "General incident response framework",
    },
  };

  const t = templates[detected];
  return {
    category: detected,
    severity,
    response: t.response,
    internal_action: t.internal,
    suggested_kb: {
      title: t.kbTitle,
      situation: rawText.slice(0, 240),
      response: `${t.response}\n\n— Internal play —\n${t.internal}`,
    },
  };
}

// =====================================================================
// Convenience: today's date
// =====================================================================

export { today };
