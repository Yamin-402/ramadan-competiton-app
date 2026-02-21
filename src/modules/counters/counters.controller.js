import { countersService } from "./counters.service.js";

export async function getMyCounters(req, res) {
  const data = await countersService.getMyCounters(req.auth);
  res.status(200).json({ data });
}