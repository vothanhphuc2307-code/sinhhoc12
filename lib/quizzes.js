'use strict';
const crypto = require('crypto');
const { BANK, LESSONS, SOURCES } = require('./bank');
const TOTAL_TESTS = 24;
const QUESTIONS_PER_TEST = 10;
const VALID_SKILLS = [...new Set(BANK.map(item => item.skill))];
const VALID_IDS = new Set(BANK.map(item => item.id));

function normalizeTestId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_TESTS) return null;
  return id;
}
function publicQuestion(item) {
  // Deliberately exclude correct answer, explanation, repair text and source audit internals before submission.
  return { id: item.id, lesson: item.lesson, lessonTitle: item.lessonTitle, skill: item.skill,
    prompt: item.prompt, choices: item.choices, level: item.level };
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
  const lessonOrder = [1,2,3,4,5].sort((a,b) => (((a * 7 + id * 3) % 13) - ((b * 7 + id * 3) % 13)));
  const groups = lessonOrder.map(lesson => picked.filter(item => item.lesson === lesson));
  const ordered = [];
  for (let round = 0; round < 2; round++) for (const group of groups) ordered.push(group[round]);
  return {
    id, mode: 'standard', title: `Đề luyện tập ${String(id).padStart(2, '0')}`,
    subtitle: '10 câu · 15 phút · Bài 1–5', totalQuestions: QUESTIONS_PER_TEST,
    durationSeconds: 15 * 60, lessonNames: Object.values(LESSONS),
    sourceSummary: 'Câu hỏi tự biên soạn/diễn đạt lại và đối chiếu với SGK KNTT cùng ngân hàng trắc nghiệm tham khảo.',
    questions: ordered.map(publicQuestion)
  };
}
function getQuestionById(id) { return BANK.find(item => item.id === id); }
function stableScore(seed, id) {
  // Deterministic shuffling makes the same adaptive configuration reproducible at submit time.
  const digest = crypto.createHash('sha256').update(`${seed}:${id}`).digest();
  return digest.readUInt32BE(0);
}
function normalizeAdaptiveSkills(raw) {
  const input = Array.isArray(raw) ? raw : [];
  const output = [];
  for (const item of input.slice(0, 15)) {
    const name = typeof item === 'string' ? item : item && typeof item.skill === 'string' ? item.skill : '';
    if (VALID_SKILLS.includes(name) && !output.includes(name)) output.push(name);
  }
  return output;
}
function normalizeExcludedIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(id => typeof id === 'string' && VALID_IDS.has(id)))].slice(0, BANK.length);
}
function getAdaptiveTest(rawSkills, rawExcludedIds = [], rawSeed = 1) {
  const skills = normalizeAdaptiveSkills(rawSkills);
  const excludedIds = normalizeExcludedIds(rawExcludedIds);
  const nSeed = Number(rawSeed);
  const seed = Number.isSafeInteger(nSeed) && nSeed >= 0 && nSeed <= 2147483647 ? nSeed : 1;
  const excluded = new Set(excludedIds);
  let pool = BANK.filter(item => !excluded.has(item.id));
  if (pool.length < QUESTIONS_PER_TEST) pool = BANK.slice();
  const ranked = (items, salt = 0) => items.slice().sort((a,b) => stableScore(seed + salt, a.id) - stableScore(seed + salt, b.id));
  const selected = [];
  const selectedIds = new Set();
  const lessonCounts = new Map();
  const skillCounts = new Map();
  const add = item => {
    if (!item || selectedIds.has(item.id) || selected.length >= QUESTIONS_PER_TEST) return false;
    selected.push(item); selectedIds.add(item.id);
    lessonCounts.set(item.lesson, (lessonCounts.get(item.lesson) || 0) + 1);
    skillCounts.set(item.skill, (skillCounts.get(item.skill) || 0) + 1);
    return true;
  };
  // First spend up to six slots on the student's weak skills, with no more than two from one skill.
  for (let priority = 0; priority < skills.length && selected.length < 6; priority++) {
    const candidates = ranked(pool.filter(item => item.skill === skills[priority] && (skillCounts.get(item.skill) || 0) < 2), priority + 11);
    for (const item of candidates) {
      if (selected.length >= 6) break;
      if ((lessonCounts.get(item.lesson) || 0) >= 3) continue;
      add(item);
    }
  }
  // Retain broad coverage so a remedial quiz can still reveal cross-lesson gaps.
  for (let lesson = 1; lesson <= 5 && selected.length < QUESTIONS_PER_TEST; lesson++) {
    if ((lessonCounts.get(lesson) || 0) > 0) continue;
    const candidate = ranked(pool.filter(item => item.lesson === lesson && !selectedIds.has(item.id)), lesson + 71)[0];
    add(candidate);
  }
  // Fill remaining slots with unseen questions, preferring a lesson balance.
  for (const item of ranked(pool, 101)) {
    if (selected.length >= QUESTIONS_PER_TEST) break;
    if ((lessonCounts.get(item.lesson) || 0) < 3) add(item);
  }
  if (selected.length < QUESTIONS_PER_TEST) {
    for (const item of ranked(BANK, 211)) { if (selected.length >= QUESTIONS_PER_TEST) break; add(item); }
  }
  // Shuffle position without losing determinism.
  const ordered = ranked(selected, 509);
  return {
    id: 0, mode: 'adaptive', title: 'Đề vá lỗ hổng cá nhân',
    subtitle: '10 câu ưu tiên kỹ năng cần củng cố · 15 phút',
    totalQuestions: QUESTIONS_PER_TEST, durationSeconds: 15 * 60,
    adaptiveSkills: skills, excludedIds, seed,
    questions: ordered.map(publicQuestion),
    lessonNames: Object.values(LESSONS),
    sourceSummary: 'Bộ câu hỏi theo trọng tâm SGK KNTT; câu sai trước đó được ưu tiên tránh lặp y nguyên.'
  };
}
function recommendedTests(currentTestId, weakSkills) {
  if (!weakSkills || !weakSkills.length) {
    const current = Number(currentTestId) || 0;
    return [((current % TOTAL_TESTS) + 1), (((current + 1) % TOTAL_TESTS) + 1), (((current + 2) % TOTAL_TESTS) + 1)];
  }
  const skillSet = new Set(weakSkills);
  return Array.from({ length: TOTAL_TESTS }, (_, i) => i + 1)
    .filter(id => id !== Number(currentTestId))
    .map(id => {
      const test = getTest(id);
      const matches = test.questions.reduce((n, item) => n + (skillSet.has(getQuestionById(item.id).skill) ? 1 : 0), 0);
      return { id, matches };
    })
    .sort((a,b) => b.matches - a.matches || a.id - b.id)
    .slice(0,3).map(item => item.id);
}
module.exports = { TOTAL_TESTS, QUESTIONS_PER_TEST, LESSONS, SOURCES, VALID_SKILLS, normalizeTestId, normalizeAdaptiveSkills,
  normalizeExcludedIds, getTest, getAdaptiveTest, getQuestionById, recommendedTests };
