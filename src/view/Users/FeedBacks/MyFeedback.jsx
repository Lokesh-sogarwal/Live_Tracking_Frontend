import React from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import useResource from "../../../hooks/useResource";
import { PageHeader, Panel } from "../../../Components/ui";
import Conversation, { CATEGORY_LABEL, StatusBadge } from "./Conversation";
import "./feedback.css";

// The submitter's own conversation (GET /feedback/mine/:id answers 404 for anyone else's).
export default function MyFeedback() {
  const { id } = useParams();
  const res = useResource(`/feedback/mine/${id}`);
  const fb = res.status === "ok" ? res.data : null;

  return (
    <div className="ui-page ui-page-narrow">
      <Link to="/Feedback" className="ui-btn ui-btn-ghost ui-btn-sm fb-back">
        <FiArrowLeft aria-hidden="true" /> All feedback
      </Link>
      <PageHeader
        title={fb ? fb.subject || `Feedback ${fb.reference}` : "Feedback"}
        description={fb ? `${fb.reference} · ${CATEGORY_LABEL[fb.category]}` : undefined}
        actions={fb && <StatusBadge status={fb.status} />}
      />
      <Panel
        title="Conversation"
        status={res.status === "idle" ? "loading" : res.status === "error" ? "error" : res.status}
        onRetry={res.reload}
        isEmpty={false}
      >
        {fb && (
          <>
            <Conversation feedback={fb} />
            {fb.replies.length === 0 && <p className="ui-hint fb-waiting">No reply yet. You'll get a notification when the team answers.</p>}
          </>
        )}
      </Panel>
    </div>
  );
}
