import pool from '../db/index.js';
import { deleteImage, uploadImage } from '../services/s3Service.js';
import { formatQuestion } from './questionController.js';
import {
  buildQuestionVersionMatchExpression,
  getExpectedQuestionVersion,
  matchesQuestionVersion,
  sendMissingQuestionVersionResponse,
  sendQuestionVersionConflictResponse,
} from '../services/questionVersionService.js';

const loadQuestionById = async (questionId) => {
  const result = await pool.query('SELECT * FROM questions WHERE question_id = $1', [questionId]);
  return result.rows[0] || null;
};

const resolveQuestionWriteConflict = async (questionId, res) => {
  const currentQuestionRow = await loadQuestionById(questionId);

  if (!currentQuestionRow) {
    return res.status(404).json({ error: 'Not Found', message: `Question with ID ${questionId} not found.` });
  }

  return sendQuestionVersionConflictResponse(res, currentQuestionRow, formatQuestion);
};

// POST /questions/:id/images
// AI-generated (edited by Jasmine)
const uploadQuestionImages = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'No images provided. Send files under the "images" field.',
    });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const invalidFiles = req.files.filter((file) => !allowedTypes.includes(file.mimetype));
  if (invalidFiles.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `Invalid file type(s): ${invalidFiles.map((file) => file.originalname).join(', ')}. Allowed: jpeg, png, gif, webp.`,
    });
  }

  const maxSize = 5 * 1024 * 1024;
  const oversizedFiles = req.files.filter((file) => file.size > maxSize);
  if (oversizedFiles.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `File(s) too large: ${oversizedFiles.map((file) => file.originalname).join(', ')}. Max size is 5MB.`,
    });
  }

  try {
    const current = await loadQuestionById(id);
    if (!current) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    const expectedQuestionVersion = getExpectedQuestionVersion(req);
    if (!expectedQuestionVersion) {
      return sendMissingQuestionVersionResponse(res);
    }

    if (!matchesQuestionVersion(current.updated_at, expectedQuestionVersion)) {
      return sendQuestionVersionConflictResponse(res, current, formatQuestion);
    }

    const newUrls = await Promise.all(
      req.files.map((file) => uploadImage(file.buffer, file.originalname, file.mimetype))
    );

    const result = await pool.query(
      `UPDATE questions
       SET image_urls = image_urls || $1::text[],
           updated_at = NOW()
       WHERE question_id = $2
         AND ${buildQuestionVersionMatchExpression('updated_at', '$3')}
       RETURNING *`,
      [newUrls, id, expectedQuestionVersion.timestampMs]
    );

    if (result.rows.length === 0) {
      await Promise.all(
        newUrls.map((imageUrl) =>
          deleteImage(imageUrl).catch((error) =>
            console.error('[uploadQuestionImages] conflict cleanup failed:', error)
          )
        )
      );
      return resolveQuestionWriteConflict(id, res);
    }

    return res.status(200).json({
      message: `${newUrls.length} image(s) uploaded successfully.`,
      uploadedUrls: newUrls,
      imageUrls: result.rows[0].image_urls,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error('[uploadQuestionImages]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// DELETE /questions/:id/images
const deleteQuestionImage = async (req, res) => {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  if (!imageUrl) {
    return res.status(400).json({ error: 'Bad Request', message: 'imageUrl is required in the request body.' });
  }

  try {
    const current = await loadQuestionById(id);
    if (!current) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    const expectedQuestionVersion = getExpectedQuestionVersion(req);
    if (!expectedQuestionVersion) {
      return sendMissingQuestionVersionResponse(res);
    }

    if (!matchesQuestionVersion(current.updated_at, expectedQuestionVersion)) {
      return sendQuestionVersionConflictResponse(res, current, formatQuestion);
    }

    const currentUrls = Array.isArray(current.image_urls) ? current.image_urls : [];
    if (!currentUrls.includes(imageUrl)) {
      return res.status(404).json({ error: 'Not Found', message: 'Image URL not found on this question.' });
    }

    const updatedUrls = currentUrls.filter((url) => url !== imageUrl);
    const result = await pool.query(
      `UPDATE questions
          SET image_urls = $1,
              updated_at = NOW()
        WHERE question_id = $2
          AND ${buildQuestionVersionMatchExpression('updated_at', '$3')}
        RETURNING image_urls, updated_at`,
      [updatedUrls, id, expectedQuestionVersion.timestampMs]
    );

    if (result.rows.length === 0) {
      return resolveQuestionWriteConflict(id, res);
    }

    await deleteImage(imageUrl).catch((error) => {
      console.error('[deleteQuestionImage] S3 cleanup failed:', error);
    });

    return res.status(200).json({
      message: 'Image deleted successfully.',
      imageUrls: result.rows[0].image_urls,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error('[deleteQuestionImage]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

export { uploadQuestionImages, deleteQuestionImage };
