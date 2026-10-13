'use strict';
const assert = require('node:assert/strict');
const { BANK } = require('../api/_bank');
const { TOTAL_TESTS, getTest } = require('../api/_quizzes');
const { analyzeSubmission } = require('../api/_diagnostics');

assert.equal(BANK.length, 100, 'Expected 100 questions in the bank');
for (let lesson = 1; lesson <= 5; lesson++) {
  assert.equal(BANK.filter(item => item.lesson === lesson).length, 20, `Expected 20 questions for lesson ${lesson}`);
}
const uniqueSets = new Set();
for (let testId = 1; testId <= TOTAL_TESTS; testId++) {
  const test = getTest(testId);
  assert.ok(test, `Test ${testId} should exist`);
  assert.equal(test.questions.length, 10, `Test ${testId} should have 10 questions`);
  const setKey = test.questions.map(item => item.id).sort().join('|');
  uniqueSets.add(setKey);
  for (const item of test.questions) {
    assert.equal(item.choices.length, 4, 'Every question should have four answer choices');
    assert.equal(Object.hasOwn(item, 'correct'), false, 'Public test should not include correct answers');
    assert.equal(Object.hasOwn(item, 'explanation'), false, 'Public test should not include explanations');
  }
  const allWrong = Object.fromEntries(test.questions.map(item => [item.id, 0]));
  const result = analyzeSubmission(testId, allWrong);
  assert.equal(result.review.length, 10);
  assert.ok(result.score >= 0 && result.score <= 10);
  assert.equal(result.correctCount + result.wrongCount + result.skippedCount, 10);
  assert.ok(Array.isArray(result.weakSpots));
  assert.ok(Array.isArray(result.recommendedTests));
}
assert.equal(uniqueSets.size, TOTAL_TESTS, 'Each of the 24 tests should use a distinct question combination');
const firstTest = getTest(1);
const perfectAnswers = Object.fromEntries(firstTest.questions.map(item => [item.id, BANK.find(q => q.id === item.id).correct]));
const perfectResult = analyzeSubmission(1, perfectAnswers);
assert.equal(perfectResult.score, 10);
assert.equal(perfectResult.correctCount, 10);
assert.equal(perfectResult.weakSpots.length, 0);
assert.throws(() => analyzeSubmission(1, {'NOT_A_QUESTION': 0}), /không thuộc đề/i);
console.log('PASS: 100 câu, 24 đề khác nhau, API scoring/diagnostics and answer-key hiding checks passed.');
