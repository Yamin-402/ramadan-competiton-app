import {
  createCommitmentSchema,
  createFriendlyCommitmentSchema,
  evaluateTodaySchema,
  listCommitmentsQuerySchema,
  moneyEntryParamsSchema,
  removeEntrySchema,
  summaryQuerySchema,
} from "./money.validator.js";
import { moneyService } from "./money.service.js";

export async function createCommitment(req, res) {
  const payload = createCommitmentSchema.parse(req.body);
  const data = await moneyService.createCommitment(req.auth, payload);

  res.status(201).json({ data });
}

export async function createFriendlyCommitment(req, res) {
  const payload = createFriendlyCommitmentSchema.parse(req.body);
  const data = await moneyService.createFriendlyCommitment(req.auth, payload);

  res.status(201).json({ data });
}

export async function listCommitments(req, res) {
  const query = listCommitmentsQuerySchema.parse(req.query);
  const data = await moneyService.listCommitments(req.auth, query);

  res.status(200).json({ data });
}

export async function evaluateToday(req, res) {
  evaluateTodaySchema.parse(req.body ?? {});
  const data = await moneyService.evaluateToday(req.auth);

  res.status(200).json({ data });
}

export async function getSummary(req, res) {
  const query = summaryQuerySchema.parse(req.query);
  const data = await moneyService.getSummary(req.auth, query);

  res.status(200).json({ data });
}

export async function removeEntry(req, res) {
  const { id } = moneyEntryParamsSchema.parse(req.params);
  const payload = removeEntrySchema.parse(req.body ?? {});
  const data = await moneyService.removeEntry(req.auth, id, payload.removedReason);

  res.status(200).json({ data });
}
