'use strict';
const { BANK, LESSONS } = require('./_bank');
const TOTAL_TESTS = 24;
const QUESTIONS_PER_TEST = 10;

function normalizeTestId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_TESTS) return null;
  return id;
}

function getTest(testId) {
  const id = normalizeTestId(testId);
  if (!id) return null;
  const picked = [];
  for (let lesson = 1; lesson <= 5; lesson++) {
    const pool = BANK.filter(item => item.lesson === lesson);
    const start = ((id - 1) * 3) % pool.length;
    const second = (start + 7 + Math.floor((id - 1) / 20) * 3) % pool.length;
    picked.push(pool[start], pool[second]);
  }
  // Keep every test mixed by lesson while using a deterministic order for reliable scoring.
  const lessonOrder = [1,2,3,4,5].sort((a,b) => (((a * 7 + id * 3) % 13) - ((b * 7 + id * 3) % 13)));
  const groups = lessonOrder.map(lesson => picked.filter(item => item.lesson === lesson));
  const ordered = [];
  for (let round = 0; round < 2; round++) {
    for (const group of groups) ordered.push(group[round]);
  }
  return {
    id,
    title: `Đề luyện tập ${String(id).padStart(2, '0')}`,
    subtitle: '10 câu · 15 phút · Bài 1–5',
    totalQuestions: QUESTIONS_PER_TEST,
    durationSeconds: 15 * 60,
    lessonNames: Object.values(LESSONS),
    questions: ordered.map(item => ({
      id: item.id,
      lesson: item.lesson,
      lessonTitle: item.lessonTitle,
      prompt: item.prompt,
      choices: item.choices,
      level: item.level
    }))
  };
}

function getQuestionById(id) { return BANK.find(item => item.id === id); }

function recommendedTests(currentTestId, weakSkills) {
  if (!weakSkills || !weakSkills.length) {
    return [((currentTestId % TOTAL_TESTS) + 1), (((currentTestId + 1) % TOTAL_TESTS) + 1), (((currentTestId + 2) % TOTAL_TESTS) + 1)];
  }
  const skillSet = new Set(weakSkills);
  return Array.from({ length: TOTAL_TESTS }, (_, i) => i + 1)
    .filter(id => id !== currentTestId)
    .map(id => {
      const test = getTest(id);
      const matches = test.questions.reduce((n, item) => n + (skillSet.has(getQuestionById(item.id).skill) ? 1 : 0), 0);
      return { id, matches };
    })
    .sort((a,b) => b.matches - a.matches || a.id - b.id)
    .slice(0,3)
    .map(item => item.id);
}

module.exports = { TOTAL_TESTS, QUESTIONS_PER_TEST, normalizeTestId, getTest, getQuestionById, recommendedTests };
