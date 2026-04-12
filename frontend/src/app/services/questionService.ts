import type { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface Question {
  questionId: number;
  title: string;
  description: string;
  constraints: string | null;
  testCases: { input: string; output: string }[];
  leetcodeLink: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  topics?: string[];
  difficulty?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface QuestionsResponse {
  count: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  questions: Question[];
}

export interface TopicsResponse {
  count: number;
  topics: string[];
}

export interface CreateQuestionData {
  title: string;
  description: string;
  constraints?: string;
  testCases: { input: string; output: string }[];
  leetcodeLink?: string;
  difficulty: string;
  topics: string[];
  imageFiles?: File[];
  existingImageUrls?: string[];
}

interface QuestionErrorResponse {
  error?: string;
  code?: string;
  message?: string;
  duplicateField?: 'title' | 'leetcodeLink' | 'unknown';
  duplicateQuestion?: {
    questionId?: number;
    title?: string;
    leetcodeLink?: string | null;
  } | null;
  missingFields?: string[];
  currentQuestion?: Question | null;
  currentUpdatedAt?: string | null;
}

export interface QuestionVersionConflictData {
  message: string;
  currentQuestion: Question | null;
  currentUpdatedAt: string | null;
}

const getDuplicateQuestionMessage = (responseData: QuestionErrorResponse) => {
  if (responseData.duplicateField === 'title') {
    if (responseData.duplicateQuestion?.title) {
      return `A question with the title "${responseData.duplicateQuestion.title}" already exists.`;
    }
    return 'A question with this title already exists.';
  }

  if (responseData.duplicateField === 'leetcodeLink') {
    if (responseData.duplicateQuestion?.title) {
      return `This LeetCode link is already used by "${responseData.duplicateQuestion.title}".`;
    }
    return 'A question with this LeetCode link already exists.';
  }

  return responseData.message || 'A duplicate question already exists.';
};

export function getQuestionRequestErrorMessage(error: unknown, fallbackMessage: string) {
  const responseData = (error as AxiosError<QuestionErrorResponse>)?.response?.data;

  if (!responseData) {
    return fallbackMessage;
  }

  if (responseData.error === 'Duplicate Question') {
    return getDuplicateQuestionMessage(responseData);
  }

  if (
    responseData.error === 'Validation Error' &&
    Array.isArray(responseData.missingFields) &&
    responseData.missingFields.length === 1
  ) {
    if (responseData.missingFields[0] === 'title') {
      return 'Question title is required.';
    }

    if (responseData.missingFields[0] === 'leetcodeLink') {
      return 'LeetCode link is required.';
    }
  }

  return responseData.message || responseData.error || fallbackMessage;
}

export function getQuestionVersionConflictData(error: unknown): QuestionVersionConflictData | null {
  const responseData = (error as AxiosError<QuestionErrorResponse>)?.response?.data;

  if (!responseData || responseData.code !== 'QUESTION_VERSION_CONFLICT') {
    return null;
  }

  return {
    message: responseData.message || 'This question changed while you were editing it.',
    currentQuestion: responseData.currentQuestion || null,
    currentUpdatedAt:
      responseData.currentUpdatedAt || responseData.currentQuestion?.updatedAt || null,
  };
}

function buildQuestionFormData(data: Partial<CreateQuestionData>) {
  const formData = new FormData();

  if (data.title !== undefined) formData.append('title', data.title);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.constraints !== undefined) formData.append('constraints', data.constraints);
  if (data.leetcodeLink !== undefined) formData.append('leetcodeLink', data.leetcodeLink);
  if (data.difficulty !== undefined) formData.append('difficulty', data.difficulty);
  if (data.topics !== undefined) formData.append('topics', JSON.stringify(data.topics));
  if (data.testCases !== undefined) formData.append('testCases', JSON.stringify(data.testCases));
  if (data.existingImageUrls !== undefined) {
    formData.append('existingImageUrls', JSON.stringify(data.existingImageUrls));
  }

  data.imageFiles?.forEach((file) => {
    formData.append('images', file);
  });

  return formData;
}

function buildQuestionWriteConfig(questionVersion?: string) {
  if (!questionVersion) {
    return undefined;
  }

  return {
    headers: {
      'x-question-version': questionVersion,
    },
  };
}

export async function getQuestions(filters?: QuestionFilters): Promise<QuestionsResponse> {
  const params: Record<string, string> = {};
  if (filters?.topics && filters.topics.length > 0) {
    params.topics = filters.topics.join(',');
  }
  if (filters?.difficulty) {
    params.difficulty = filters.difficulty;
  }
  if (filters?.search) {
    params.search = filters.search;
  }
  if (filters?.page) {
    params.page = String(filters.page);
  }
  if (filters?.pageSize) {
    params.pageSize = String(filters.pageSize);
  }
  const response = await apiClient.get('/questions', { params });
  return response.data;
}

export async function getQuestionById(id: number): Promise<{ question: Question }> {
  const response = await apiClient.get(`/questions/${id}`);
  return response.data;
}

export async function getTopics(): Promise<TopicsResponse> {
  const response = await apiClient.get('/questions/topics');
  return response.data;
}

export async function createQuestion(data: CreateQuestionData) {
  const response = await apiClient.post('/questions', buildQuestionFormData(data));
  return response.data;
}

export async function updateQuestion(
  id: number,
  data: Partial<CreateQuestionData>,
  questionVersion?: string
) {
  const config = buildQuestionWriteConfig(questionVersion);
  const response = await apiClient.put(
    `/questions/${id}`,
    buildQuestionFormData(data),
    config
  );
  return response.data;
}

export async function deleteQuestion(id: number, questionVersion?: string) {
  const response = await apiClient.delete(`/questions/${id}`, buildQuestionWriteConfig(questionVersion));
  return response.data;
}
