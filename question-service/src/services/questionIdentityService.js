import pool from '../db/index.js';

const NORMALIZED_LINK_SQL = `
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(BTRIM(leetcode_link), '[?#].*$', ''),
      '/+$',
      ''
    )
  )
`;

const NORMALIZED_TITLE_SQL = `
  LOWER(REGEXP_REPLACE(BTRIM(title), '\\s+', ' ', 'g'))
`;

const DUPLICATE_ERROR_MESSAGE = 'A question with this LeetCode link or title already exists.';
const DUPLICATE_FIELD_MESSAGES = {
  title: 'A question with this title already exists.',
  leetcodeLink: 'A question with this LeetCode link already exists.',
  unknown: DUPLICATE_ERROR_MESSAGE,
};

const normalizeTitle = (title = '') =>
  String(title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeQuestionLink = (link = '') => {
  const trimmedLink = String(link ?? '').trim();
  if (!trimmedLink) {
    return null;
  }

  return trimmedLink.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
};

const formatDuplicateQuestion = (row) => ({
  questionId: row.question_id,
  title: row.title,
  leetcodeLink: row.leetcode_link,
});

const findDuplicateByLink = async (normalizedLink, excludeQuestionId) => {
  if (!normalizedLink) {
    return null;
  }

  const params = [normalizedLink];
  let excludeClause = '';

  if (excludeQuestionId !== undefined && excludeQuestionId !== null) {
    params.push(excludeQuestionId);
    excludeClause = `AND question_id <> $${params.length}`;
  }

  const result = await pool.query(
    `SELECT question_id, title, leetcode_link, description, test_cases
       FROM questions
      WHERE ${NORMALIZED_LINK_SQL} = $1
        ${excludeClause}
      LIMIT 1`,
    params
  );

  return result.rows[0] || null;
};

const findDuplicateByTitle = async (normalizedTitle, excludeQuestionId) => {
  if (!normalizedTitle) {
    return null;
  }

  const params = [normalizedTitle];
  let excludeClause = '';

  if (excludeQuestionId !== undefined && excludeQuestionId !== null) {
    params.push(excludeQuestionId);
    excludeClause = `AND question_id <> $${params.length}`;
  }

  const result = await pool.query(
    `SELECT question_id, title, leetcode_link, description, test_cases
       FROM questions
      WHERE ${NORMALIZED_TITLE_SQL} = $1
        ${excludeClause}
      LIMIT 1`,
    params
  );

  return result.rows[0] || null;
};

const findDuplicateQuestion = async ({ title, leetcodeLink, excludeQuestionId } = {}) => {
  const duplicateLinkQuestion = await findDuplicateByLink(
    normalizeQuestionLink(leetcodeLink),
    excludeQuestionId
  );

  if (duplicateLinkQuestion) {
    return {
      duplicateField: 'leetcodeLink',
      question: duplicateLinkQuestion,
    };
  }

  const duplicateTitleQuestion = await findDuplicateByTitle(
    normalizeTitle(title),
    excludeQuestionId
  );

  if (duplicateTitleQuestion) {
    return {
      duplicateField: 'title',
      question: duplicateTitleQuestion,
    };
  }

  return null;
};

const getDuplicateMessage = (duplicateField) =>
  DUPLICATE_FIELD_MESSAGES[duplicateField] || DUPLICATE_FIELD_MESSAGES.unknown;

const buildDuplicateResponse = (duplicate) => ({
  error: 'Duplicate Question',
  message: getDuplicateMessage(duplicate?.duplicateField),
  duplicateField: duplicate?.duplicateField || 'unknown',
  duplicateQuestion: duplicate?.question ? formatDuplicateQuestion(duplicate.question) : null,
});

const isQuestionUniqueViolation = (err) => {
  if (err?.code !== '23505') {
    return false;
  }

  const constraint = err.constraint || '';
  return (
    constraint.includes('questions_unique_normalized_leetcode_link') ||
    constraint.includes('questions_unique_normalized_title') ||
    constraint.includes('questions_leetcode')
  );
};

const buildUniqueViolationResponse = (err) => {
  const duplicateField = err?.constraint?.includes('title') ? 'title' : 'leetcodeLink';

  return {
    error: 'Duplicate Question',
    message: getDuplicateMessage(duplicateField),
    duplicateField,
    duplicateQuestion: null,
  };
};

export {
  buildDuplicateResponse,
  buildUniqueViolationResponse,
  findDuplicateQuestion,
  isQuestionUniqueViolation,
  normalizeQuestionLink,
  normalizeTitle,
};
