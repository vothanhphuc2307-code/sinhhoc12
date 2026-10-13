'use strict';
const { getTest, getQuestionById, recommendedTests } = require('./_quizzes');

function analyzeSubmission(testId, submittedAnswers) {
  const test = getTest(testId);
  if (!test) throw new Error('Mã đề không hợp lệ.');
  if (!submittedAnswers || typeof submittedAnswers !== 'object' || Array.isArray(submittedAnswers)) {
    throw new Error('Phiếu trả lời không hợp lệ.');
  }

  const allowed = new Set(test.questions.map(question => question.id));
  const invalidIds = Object.keys(submittedAnswers).filter(id => !allowed.has(id));
  if (invalidIds.length) throw new Error('Phiếu có câu hỏi không thuộc đề hiện tại. Hãy tải lại đề và nộp lại.');

  const skillStats = {};
  const review = test.questions.map((publicQuestion, index) => {
    const question = getQuestionById(publicQuestion.id);
    const raw = submittedAnswers[question.id];
    const selected = Number.isInteger(raw) && raw >= 0 && raw < question.choices.length ? raw : null;
    const isCorrect = selected === question.correct;
    if (!skillStats[question.skill]) {
      skillStats[question.skill] = { skill: question.skill, lesson: question.lesson, lessonTitle: question.lessonTitle, total: 0, correct: 0, incorrect: 0 };
    }
    skillStats[question.skill].total += 1;
    if (selected !== null && isCorrect) skillStats[question.skill].correct += 1;
    else skillStats[question.skill].incorrect += 1;

    return {
      number: index + 1,
      id: question.id,
      lesson: question.lesson,
      lessonTitle: question.lessonTitle,
      skill: question.skill,
      prompt: question.prompt,
      choices: question.choices,
      selected,
      selectedText: selected === null ? null : question.choices[selected],
      correct: question.correct,
      correctText: question.choices[question.correct],
      isCorrect: selected !== null && isCorrect,
      skipped: selected === null,
      explanation: question.explanation,
      repair: question.repair,
      level: question.level
    };
  });

  const correctCount = review.filter(item => item.isCorrect).length;
  const wrongCount = review.filter(item => !item.isCorrect && !item.skipped).length;
  const skippedCount = review.filter(item => item.skipped).length;
  const score = Math.round((correctCount / review.length) * 100) / 10;
  const stats = Object.values(skillStats).map(item => ({
    ...item,
    accuracy: item.total ? Math.round(item.correct / item.total * 100) : 0,
    wrongRate: item.total ? Math.round(item.incorrect / item.total * 100) : 0
  })).sort((a,b) => b.incorrect - a.incorrect || a.accuracy - b.accuracy || a.skill.localeCompare(b.skill, 'vi'));

  const missCounts = {};
  review.filter(item => !item.isCorrect).forEach(item => {
    if (!missCounts[item.skill]) missCounts[item.skill] = { skill: item.skill, lesson: item.lesson, lessonTitle: item.lessonTitle, missed: 0, skipped: 0, fixes: [] };
    missCounts[item.skill].missed += 1;
    if (item.skipped) missCounts[item.skill].skipped += 1;
    if (!missCounts[item.skill].fixes.includes(item.repair)) missCounts[item.skill].fixes.push(item.repair);
  });
  const weakSpots = Object.values(missCounts).map(item => ({
    ...item,
    repair: item.fixes[0]
  })).sort((a,b) => b.missed - a.missed || a.skill.localeCompare(b.skill, 'vi'));
  const weakSkills = weakSpots.map(item => item.skill);
  const lessonWeakness = {};
  for (const row of stats) {
    if (!lessonWeakness[row.lesson]) lessonWeakness[row.lesson] = { lesson: row.lesson, lessonTitle: row.lessonTitle, total: 0, correct: 0, incorrect: 0 };
    lessonWeakness[row.lesson].total += row.total;
    lessonWeakness[row.lesson].correct += row.correct;
    lessonWeakness[row.lesson].incorrect += row.incorrect;
  }
  const lessons = Object.values(lessonWeakness).map(item => ({
    ...item,
    accuracy: Math.round(item.correct / item.total * 100)
  })).sort((a,b) => a.accuracy - b.accuracy);

  let headline = 'Bước tiếp theo: vá đúng lỗ hổng rồi làm đề kế tiếp.';
  if (score >= 9) headline = 'Rất tốt! Ôn lại các lỗi nhỏ để giữ phong độ.';
  else if (score >= 7) headline = 'Nền tảng khá ổn. Tập trung vào các khái niệm bị nhầm.';
  else if (score < 5) headline = 'Ưu tiên củng cố kiến thức nền trước khi làm đề tốc độ.';

  return {
    testId: test.id,
    title: test.title,
    total: review.length,
    correctCount,
    wrongCount,
    skippedCount,
    score,
    headline,
    skillStats: stats,
    lessonStats: lessons,
    weakSpots,
    recommendedTests: recommendedTests(test.id, weakSkills),
    review
  };
}
module.exports = { analyzeSubmission };
