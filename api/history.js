'use strict';
const { getHistory } = require('../lib/storage');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const studentId = String((req.query && req.query.studentId) || '');
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(studentId)) return res.status(400).json({ error: 'studentId không hợp lệ.' });
  try {
    const data = await getHistory(studentId);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json({ configured: false, attempts: [], error: 'Không thể tải lịch sử cloud ở thời điểm này.' });
  }
};
