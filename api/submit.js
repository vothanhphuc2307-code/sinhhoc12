'use strict';
const crypto = require('crypto');
const { analyzeSubmission } = require('../lib/diagnostics');
const { saveAttempt } = require('../lib/storage');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const body = req.body || {};
    const testId = Number(body.testId);
    const studentId = typeof body.studentId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.studentId) ? body.studentId : null;
    const adaptiveConfig = body.mode === 'adaptive' ? { mode: 'adaptive', skills: body.adaptiveSkills, excludedIds: body.excludedIds, seed: body.seed } : null;
    const result = analyzeSubmission(testId, body.answers, adaptiveConfig);
    let cloud = { saved: false, reason: !studentId ? 'no_student_id' : 'adaptive_attempt_local_only' };
    if (studentId && result.mode === 'standard') {
      try {
        cloud = await saveAttempt({
          student_id: studentId,
          test_id: result.testId,
          score: result.score,
          correct_count: result.correctCount,
          total_questions: result.total,
          diagnostics: { headline: result.headline, skillStats: result.skillStats, lessonStats: result.lessonStats, weakSpots: result.weakSpots, recommendedTests: result.recommendedTests },
          responses: result.review.map(item => ({ id: item.id, selected: item.selected, correct: item.correct, isCorrect: item.isCorrect, skipped: item.skipped }))
        });
      } catch (error) { cloud = { saved: false, reason: 'cloud_error' }; }
    }
    return res.status(200).json({ ...result, cloudSaved: Boolean(cloud.saved), cloudNotice: cloud.saved ? 'Đã đồng bộ kết quả lên lịch sử cloud.' : 'Kết quả đã được chấm. Lịch sử vẫn được lưu trên trình duyệt này.' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Không thể chấm bài.' });
  }
};
