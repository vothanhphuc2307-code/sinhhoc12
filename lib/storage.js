'use strict';

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function baseUrl() { return String(process.env.SUPABASE_URL || '').replace(/\/$/, ''); }
function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}
async function saveAttempt(row) {
  if (!configured()) return { saved: false, reason: 'cloud_not_configured' };
  const response = await fetch(`${baseUrl()}/rest/v1/quiz_attempts`, {
    method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(row)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { saved: false, reason: 'cloud_save_failed', detail: detail.slice(0, 250) };
  }
  return { saved: true };
}
async function getHistory(studentId) {
  if (!configured()) return { configured: false, attempts: [] };
  const params = new URLSearchParams({
    student_id: `eq.${studentId}`,
    select: 'id,student_id,test_id,score,correct_count,total_questions,diagnostics,created_at',
    order: 'created_at.desc', limit: '50'
  });
  const response = await fetch(`${baseUrl()}/rest/v1/quiz_attempts?${params}`, { headers: headers() });
  if (!response.ok) return { configured: true, attempts: [], error: 'Không tải được lịch sử trên cloud.' };
  return { configured: true, attempts: await response.json() };
}
module.exports = { saveAttempt, getHistory, configured };
