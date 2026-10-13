'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BANK, LESSONS, SOURCES } = require('../lib/bank');
const { TOTAL_TESTS, QUESTIONS_PER_TEST, getTest, getAdaptiveTest, VALID_SKILLS } = require('../lib/quizzes');
const { analyzeSubmission } = require('../lib/diagnostics');

assert.equal(BANK.length, 100, 'Expected 100 questions in the bank');
assert.equal(TOTAL_TESTS, 24, 'Expected 24 standard test variants');
assert.equal(QUESTIONS_PER_TEST, 10, 'Each test should contain 10 questions');
assert.equal(VALID_SKILLS.length > 10, true, 'Expected a classified skill bank');
assert.equal(new Set(BANK.map(q => q.id)).size, 100, 'Question IDs should be unique');
for (let lesson = 1; lesson <= 5; lesson++) {
  assert.equal(BANK.filter(item => item.lesson === lesson).length, 20, `Expected 20 questions for lesson ${lesson}`);
  assert.ok(SOURCES[lesson]?.some(s => /sgkvn/i.test(s.url)), `Lesson ${lesson} should link its textbook-aligned page`);
  assert.ok(SOURCES[lesson]?.some(s => /vietjack/i.test(s.url)), `Lesson ${lesson} should link an external question bank`);
}
for (const question of BANK) {
  assert.ok(question.prompt.length > 10, `${question.id}: prompt too short`);
  assert.equal(question.choices.length, 4, `${question.id}: expected four options`);
  assert.equal(new Set(question.choices).size, 4, `${question.id}: duplicated options`);
  assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4, `${question.id}: invalid key index`);
  assert.ok(question.explanation?.length > 20, `${question.id}: missing explanation`);
  assert.ok(question.repair?.length > 10, `${question.id}: missing knowledge-repair guidance`);
  assert.ok(LESSONS[question.lesson], `${question.id}: unknown lesson`);
  assert.ok(question.sources?.length >= 2, `${question.id}: missing source references`);
  for (const source of question.sources) assert.ok(/^https:\/\//.test(source.url), `${question.id}: non-HTTPS source URL`);
}

const uniqueSets = new Set();
for (let testId = 1; testId <= TOTAL_TESTS; testId++) {
  const test = getTest(testId);
  assert.ok(test, `Test ${testId} should exist`);
  assert.equal(test.questions.length, QUESTIONS_PER_TEST);
  const ids = test.questions.map(item => item.id);
  assert.equal(new Set(ids).size, 10, `Test ${testId} repeats a question internally`);
  uniqueSets.add(ids.slice().sort().join('|'));
  for (let lesson = 1; lesson <= 5; lesson++) assert.equal(test.questions.filter(q => q.lesson === lesson).length, 2, `Test ${testId} must cover lesson ${lesson} twice`);
  for (const item of test.questions) {
    for (const forbidden of ['correct','correctText','explanation','repair','sources']) assert.equal(Object.hasOwn(item, forbidden), false, `Public test leaks ${forbidden}`);
  }
  const allWrong = Object.fromEntries(test.questions.map(item => [item.id, 0]));
  const result = analyzeSubmission(testId, allWrong);
  assert.equal(result.review.length, 10);
  assert.ok(result.score >= 0 && result.score <= 10);
  assert.equal(result.correctCount + result.wrongCount + result.skippedCount, 10);
  assert.equal(result.weakSpots.length > 0, true);
  assert.equal(result.review.every(row => row.sources?.length > 0), true, 'Review should include source links');
  assert.ok(result.recommendedTests.length <= 3);
}
assert.equal(uniqueSets.size, TOTAL_TESTS, 'Each of the 24 tests should use a distinct question combination');

const first = getTest(1);
const perfectAnswers = Object.fromEntries(first.questions.map(item => [item.id, BANK.find(q => q.id === item.id).correct]));
const perfect = analyzeSubmission(1, perfectAnswers);
assert.equal(perfect.score, 10);
assert.equal(perfect.correctCount, 10);
assert.equal(perfect.weakSpots.length, 0);
assert.throws(() => analyzeSubmission(1, {'NOT_A_QUESTION': 0}), /không thuộc đề/i);
assert.throws(() => analyzeSubmission(1, null), /phiếu trả lời/i);

const skills = [{ skill: BANK.find(q => q.lesson === 4).skill }];
const excluded = first.questions.map(q => q.id);
const adaptive1 = getAdaptiveTest(skills, excluded, 98765);
const adaptive2 = getAdaptiveTest(skills, excluded, 98765);
assert.equal(adaptive1.id, 0);
assert.equal(adaptive1.mode, 'adaptive');
assert.equal(adaptive1.questions.length, 10);
assert.equal(new Set(adaptive1.questions.map(q => q.id)).size, 10);
assert.deepEqual(adaptive1.questions.map(q => q.id), adaptive2.questions.map(q => q.id), 'Adaptive test should be deterministic for the same seed/config');
for (let lesson = 1; lesson <= 5; lesson++) assert.ok(adaptive1.questions.some(q => q.lesson === lesson), 'Adaptive quiz should cover all five lessons');
for (const item of adaptive1.questions) assert.equal(Object.hasOwn(item, 'correct'), false);
const adaptiveAnswers = Object.fromEntries(adaptive1.questions.map(q => [q.id, BANK.find(b => b.id === q.id).correct]));
const adaptivePerfect = analyzeSubmission(0, adaptiveAnswers, { mode: 'adaptive', skills, excludedIds: excluded, seed: 98765 });
assert.equal(adaptivePerfect.mode, 'adaptive');
assert.equal(adaptivePerfect.score, 10, 'Adaptive quiz should rehydrate the same test when grading');
const adaptiveWrong = analyzeSubmission(0, Object.fromEntries(adaptive1.questions.map(q => [q.id, 3])), { mode:'adaptive', skills, excludedIds:excluded, seed:98765 });
assert.equal(adaptiveWrong.review.length, 10);

// Internal question-bank modules must not be exposed as API function paths.
const apiFiles = fs.readdirSync(path.join(__dirname, '..', 'api')).filter(file => file.endsWith('.js'));
assert.ok(apiFiles.includes('test.js') && apiFiles.includes('submit.js') && apiFiles.includes('adaptive.js'));
assert.ok(!apiFiles.some(file => /bank|quiz|diagnostic|storage/i.test(file)), 'Internal modules should not be serverless endpoints');
const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
assert.ok(vercel.routes.some(route => route.src === '/lib/(.*)' && route.status === 404), 'Vercel should block direct static access to internal modules');
console.log('PASS: 100 questions, five 20-question lesson pools, 24 distinct 10-question tests, source references, hidden keys, standard/adaptive scoring, adaptive re-grading and deploy routing checks.');
