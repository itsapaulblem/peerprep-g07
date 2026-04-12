const QUESTION_VERSION_HEADER = 'X-Question-Version';
const QUESTION_VERSION_HEADER_KEY = 'x-question-version';

const parseQuestionVersion = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  // If it's already a Date object, convert it to ISO string for proper millisecond handling
  let dateValue;
  if (rawValue instanceof Date) {
    dateValue = rawValue;
  } else {
    const trimmedValue = `${rawValue}`.trim();
    if (!trimmedValue) {
      return null;
    }
    dateValue = new Date(trimmedValue);
  }

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return {
    isoString: dateValue.toISOString(),
    timestampMs: dateValue.getTime(),
  };
};

const normalizeQuestionVersion = (value) => parseQuestionVersion(value)?.isoString || null;

const getQuestionVersionTimestampMs = (value) => parseQuestionVersion(value)?.timestampMs ?? null;

const getExpectedQuestionVersion = (req) =>
  parseQuestionVersion(req.get(QUESTION_VERSION_HEADER_KEY));

const matchesQuestionVersion = (rowUpdatedAt, expectedQuestionVersion) => {
  const currentQuestionVersionMs = getQuestionVersionTimestampMs(rowUpdatedAt);
  return Number.isInteger(currentQuestionVersionMs)
    && Boolean(expectedQuestionVersion)
    && currentQuestionVersionMs === expectedQuestionVersion.timestampMs;
};

const buildQuestionVersionMatchExpression = (columnName, paramToken) =>
  `FLOOR(EXTRACT(EPOCH FROM ${columnName}) * 1000)::bigint = ${paramToken}::bigint`;

const buildMissingQuestionVersionResponse = () => ({
  error: 'Precondition Required',
  code: 'QUESTION_VERSION_REQUIRED',
  message: `A valid ${QUESTION_VERSION_HEADER} header is required for this operation.`,
});

const buildQuestionVersionConflictResponse = (currentRow, formatQuestion) => {
  const currentQuestion = currentRow ? formatQuestion(currentRow) : null;

  return {
    error: 'Conflict',
    code: 'QUESTION_VERSION_CONFLICT',
    message: 'This question was updated by someone else. Latest version has been returned.',
    currentQuestion,
    currentUpdatedAt: currentQuestion?.updatedAt || null,
  };
};

const sendMissingQuestionVersionResponse = (res) =>
  res.status(428).json(buildMissingQuestionVersionResponse());

const sendQuestionVersionConflictResponse = (res, currentRow, formatQuestion) =>
  res.status(409).json(buildQuestionVersionConflictResponse(currentRow, formatQuestion));

export {
  QUESTION_VERSION_HEADER,
  buildQuestionVersionMatchExpression,
  buildQuestionVersionConflictResponse,
  getExpectedQuestionVersion,
  getQuestionVersionTimestampMs,
  matchesQuestionVersion,
  normalizeQuestionVersion,
  sendMissingQuestionVersionResponse,
  sendQuestionVersionConflictResponse,
};
