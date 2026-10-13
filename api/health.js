'use strict';
const { BANK, LESSONS } = require('../lib/bank');
const { TOTAL_TESTS, QUESTIONS_PER_TEST } = require('../lib/quizzes');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  return res.status(200).json({ status:'ok', course:'Sinh học 12 · Kết nối tri thức · Chương I · Bài 1–5', questionCount:BANK.length,
    tests:TOTAL_TESTS, questionsPerTest:QUESTIONS_PER_TEST,
    lessonCounts:Object.fromEntries(Object.keys(LESSONS).map(id=>[id,BANK.filter(q=>q.lesson===Number(id)).length])), answerKeyReturnedByTestEndpoint:false });
};
