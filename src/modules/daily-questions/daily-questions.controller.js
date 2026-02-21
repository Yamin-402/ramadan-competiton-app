import {
  listMyHistoryQuerySchema,
  questionParamsSchema,
  submitDailyAnswerSchema,
} from "./daily-questions.validator.js";
import { dailyQuestionsService } from "./daily-questions.service.js";

export async function getTodayQuestion(_req, res) {
  const data = await dailyQuestionsService.getTodayQuestion();
  res.status(200).json({ data });
}

export async function submitDailyAnswer(req, res) {
  const { questionId } = questionParamsSchema.parse(req.params);
  const payload = submitDailyAnswerSchema.parse(req.body);
  const data = await dailyQuestionsService.submitAnswer(req.auth, questionId, payload);

  res.status(201).json({ data });
}

export async function getMyHistory(req, res) {
  const query = listMyHistoryQuerySchema.parse(req.query);
  const data = await dailyQuestionsService.getMyHistory(req.auth, query);

  res.status(200).json({ data });
}
