'use strict';
const crypto = require('crypto');
const { getAdaptiveTest } = require('../lib/quizzes');
module.exports = function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const body = req.body || {};
    const test = getAdaptiveTest(body.skills, body.excludedIds, crypto.randomInt(1, 2147483000));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(test);
  } catch (error) { return res.status(400).json({ error: error.message || 'Không tạo được đề vá lỗ hổng.' }); }
};
