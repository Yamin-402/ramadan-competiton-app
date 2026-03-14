import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import {
  AdminUser,
  MotivationNotificationReportRow,
  NotificationCampaignListItem,
  NotificationTargetType,
  Tag,
} from "../types";

interface NotificationsModuleProps {
  tags: Tag[];
  users: AdminUser[];
}

function toggleId(current: number[], id: number): number[] {
  if (current.includes(id)) {
    return current.filter((value) => value !== id);
  }
  return [...current, id];
}

export function NotificationsModule({ tags, users }: NotificationsModuleProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<NotificationTargetType>("ALL_USERS");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [campaigns, setCampaigns] = useState<NotificationCampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);
  const [generatingMotivation, setGeneratingMotivation] = useState(false);
  const [motivationLookbackDays, setMotivationLookbackDays] = useState("14");
  const [motivationLimitUsers, setMotivationLimitUsers] = useState("80");
  const [motivationReports, setMotivationReports] = useState<MotivationNotificationReportRow[]>([]);
  const [motivationDryRun, setMotivationDryRun] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listNotificationCampaigns(100);
      setCampaigns(data);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load campaigns"));
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: number, titleText: string) => {
    if (!window.confirm(`Delete campaign "${titleText}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeletingCampaignId(campaignId);
    try {
      await adminApi.deleteNotificationCampaign(campaignId);
      setSuccess("Campaign deleted.");
      await loadCampaigns();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not delete campaign"));
    } finally {
      setDeletingCampaignId(null);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await adminApi.createNotificationCampaign({
        title: title.trim(),
        body: body.trim(),
        targetType,
        isAnnouncement,
        filters: {
          tagIds: selectedTagIds,
          userIds: selectedUserIds,
        },
      });

      setTitle("");
      setBody("");
      setTargetType("ALL_USERS");
      setIsAnnouncement(false);
      setSelectedTagIds([]);
      setSelectedUserIds([]);
      setSuccess("Campaign created.");
      await loadCampaigns();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not create campaign"));
    } finally {
      setSubmitting(false);
    }
  };

  const runMotivationGenerator = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setGeneratingMotivation(true);

    try {
      const lookbackDays = Number(motivationLookbackDays);
      const limitUsers = Number(motivationLimitUsers);
      if (!Number.isInteger(lookbackDays) || lookbackDays < 3) {
        throw new Error("Lookback days must be at least 3.");
      }
      if (!Number.isInteger(limitUsers) || limitUsers < 1) {
        throw new Error("Users limit must be at least 1.");
      }

      const result = await adminApi.generateMotivationNotifications({
        lookbackDays,
        limitUsers,
        dryRun: motivationDryRun,
      });

      setMotivationReports(result.reports);
      if (result.dryRun) {
        setSuccess(`Generated ${result.reports.length} motivation report(s).`);
      } else {
        setSuccess(
          `Generated ${result.reports.length} report(s) and created ${result.notificationsCreated} notification(s).`
        );
        await loadCampaigns();
      }
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not generate motivation reports"));
    } finally {
      setGeneratingMotivation(false);
    }
  };

  return (
    <div className="stack">
      <PanelCard title="AI Motivation Reports">
        <form className="form-grid" onSubmit={runMotivationGenerator}>
          <label>
            Lookback days
            <input
              type="number"
              min={3}
              max={90}
              value={motivationLookbackDays}
              onChange={(event) => setMotivationLookbackDays(event.target.value)}
            />
          </label>
          <label>
            Users limit
            <input
              type="number"
              min={1}
              max={500}
              value={motivationLimitUsers}
              onChange={(event) => setMotivationLimitUsers(event.target.value)}
            />
          </label>
          <label className="checkbox-label form-grid__full">
            <input
              type="checkbox"
              checked={motivationDryRun}
              onChange={(event) => setMotivationDryRun(event.target.checked)}
            />
            Dry run (generate reports only, no notifications)
          </label>

          <div className="form-grid__full inline-form">
            <button type="submit" disabled={generatingMotivation}>
              {generatingMotivation
                ? "Generating..."
                : motivationDryRun
                  ? "Generate reports"
                  : "Generate + send notifications"}
            </button>
          </div>
        </form>

        {motivationReports.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Summary</th>
                  <th>Notification title</th>
                  <th>Notification body</th>
                </tr>
              </thead>
              <tbody>
                {motivationReports.map((report) => (
                  <tr key={report.userId}>
                    <td>{report.displayName || report.email}</td>
                    <td>{report.summary}</td>
                    <td>{report.title}</td>
                    <td>{report.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PanelCard>

      <PanelCard title="Create Notification Campaign" actions={<button onClick={() => void loadCampaigns()}>Refresh</button>}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            Target
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as NotificationTargetType)}
            >
              <option value="ALL_USERS">ALL_USERS</option>
              <option value="TAGS">TAGS</option>
              <option value="USER_IDS">USER_IDS</option>
            </select>
          </label>
          <label className="form-grid__full">
            Body
            <textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} required />
          </label>

          <label className="checkbox-label form-grid__full">
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={(event) => setIsAnnouncement(event.target.checked)}
            />
            Show as app popup announcement
          </label>

          {targetType === "TAGS" ? (
            <fieldset className="form-grid__full">
              <legend>Select tags</legend>
              <div className="chip-row">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      className={`chip ${active ? "chip--active" : ""}`}
                      onClick={() => setSelectedTagIds((prev) => toggleId(prev, tag.id))}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {targetType === "USER_IDS" ? (
            <fieldset className="form-grid__full">
              <legend>Select users</legend>
              <div className="chip-row">
                {users.map((user) => {
                  const active = selectedUserIds.includes(user.id);
                  return (
                    <button
                      type="button"
                      key={user.id}
                      className={`chip ${active ? "chip--active" : ""}`}
                      onClick={() => setSelectedUserIds((prev) => toggleId(prev, user.id))}
                    >
                      {user.displayName || user.email}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {error ? <p className="error-text form-grid__full">{error}</p> : null}
          {success ? <p className="success-text form-grid__full">{success}</p> : null}
          <div className="form-grid__full">
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create campaign"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Campaigns">
        {loading ? <p className="muted-text">Loading campaigns...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Target</th>
                <th>Announcement</th>
                <th>Pending</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((item) => (
                <tr key={item.campaign.id}>
                  <td>{item.campaign.id}</td>
                  <td>{item.campaign.title}</td>
                  <td>{item.campaign.targetType}</td>
                  <td>{item.campaign.filters?.isAnnouncement ? "Yes" : "No"}</td>
                  <td>{item.stats.pending}</td>
                  <td>{item.stats.sent}</td>
                  <td>{item.stats.failed}</td>
                  <td>{new Date(item.campaign.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void deleteCampaign(item.campaign.id, item.campaign.title)}
                      disabled={deletingCampaignId === item.campaign.id}
                    >
                      {deletingCampaignId === item.campaign.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
