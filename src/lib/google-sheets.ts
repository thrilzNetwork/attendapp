import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: key.private_key,
    scopes: SCOPES,
  });
}

export function extractSheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid Google Sheet URL — should contain /spreadsheets/d/...');
  return match[1];
}

export async function initializeShuttleSheet(sheetUrl: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(sheetUrl);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

  // Create tabs if missing
  const needed = [
    { title: 'SCHEDULE', index: 0 },
    { title: 'REQUESTS', index: 1 },
    { title: 'DRIVERS', index: 2 },
  ];

  const requests: Array<{ addSheet: { properties: { title: string; index: number } } }> = [];
  for (const tab of needed) {
    if (!existingTitles.includes(tab.title)) {
      requests.push({ addSheet: { properties: { title: tab.title, index: tab.index } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  // Populate SCHEDULE
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: 'SCHEDULE!A1:F9', valueInputOption: 'USER_ENTERED',
    requestBody: { values: [
      ['Day', 'Route', 'Depart Hotel', 'Arrive Airport', 'Direction', 'Notes'],
      ['Mon–Sun', 'Hotel → MIA', '6:00 AM', '6:30 AM', 'Departure', ''],
      ['Mon–Sun', 'Hotel → MIA', '8:00 AM', '8:30 AM', 'Departure', ''],
      ['Mon–Sun', 'Hotel → MIA', '10:00 AM', '10:30 AM', 'Departure', ''],
      ['Mon–Sun', 'Hotel → MIA', '12:00 PM', '12:30 PM', 'Departure', ''],
      ['Mon–Sun', 'MIA → Hotel', '2:00 PM', '2:30 PM', 'Arrival', ''],
      ['Mon–Sun', 'MIA → Hotel', '4:00 PM', '4:30 PM', 'Arrival', ''],
      ['Mon–Sun', 'MIA → Hotel', '6:00 PM', '6:30 PM', 'Arrival', ''],
      ['Mon–Sun', 'MIA → Hotel', '8:00 PM', '8:30 PM', 'Arrival', ''],
    ] },
  });

  // Populate REQUESTS headers
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: 'REQUESTS!A1:N1', valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[
      'Timestamp', 'Guest', 'Room', 'Date', 'Time',
      'Type', 'From', 'To', 'Airline', 'Flight',
      'Passengers', 'Notes', 'Status', 'Assigned Driver',
    ]] },
  });

  // Populate DRIVERS headers
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: 'DRIVERS!A1:E1', valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['Name', 'Phone', 'Vehicle', 'Capacity', 'Active Today']] },
  });

  // Delete 'Sheet1' if it exists and we now have enough tabs
  if (existingTitles.includes('Sheet1') && existingTitles.filter(t => t !== 'Sheet1').length >= 0) {
    const sheet1 = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Sheet1');
    if (sheet1?.properties?.sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] },
      }).catch(() => {});
    }
  }

  return { ok: true, spreadsheetId, email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL };
}

export async function appendTransportRequest(sheetUrl: string, request: {
  guestName: string; room: string; date: string; time: string;
  direction: string; pickup: string; destination: string;
  airline?: string; flight?: string; passengers?: string; notes?: string;
}) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(sheetUrl);

  await sheets.spreadsheets.values.append({
    spreadsheetId, range: 'REQUESTS!A:N', valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      new Date().toLocaleString(),
      request.guestName,
      request.room,
      request.date,
      request.time,
      request.direction === 'arrival' ? 'Arrival' : 'Departure',
      request.pickup,
      request.destination,
      request.airline || '',
      request.flight || '',
      request.passengers || '1',
      request.notes || '',
      'Pending',
      '',
    ]] },
  });

  return { ok: true };
}
