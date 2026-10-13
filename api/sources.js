'use strict';
const { LESSONS, SOURCES } = require('../lib/bank');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ lessons: Object.entries(LESSONS).map(([id,title]) => ({ id:Number(id), title, sources:SOURCES[id] || [] })) });
};
