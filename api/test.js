'use strict';
const { getTest } = require('./_quizzes');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const test = getTest(req.query && (req.query.set || req.query.id));
  if (!test) return res.status(400).json({ error: 'Mã đề không hợp lệ. Chọn đề từ 1 đến 24.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(test);
};
