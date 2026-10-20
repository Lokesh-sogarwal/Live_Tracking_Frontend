import React from "react";

// Page title block. The top bar already shows the breadcrumb, so pages only add a
// description and their contextual actions here.
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="ui-page-header">
      <div>
        <h2 className="ui-page-title">{title}</h2>
        {description && <p className="ui-page-description">{description}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  );
}
