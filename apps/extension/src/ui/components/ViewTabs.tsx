import { ReactNode } from "react";

import { RecDot } from "~/ui/components/Section";
import { TabsList, TabsTrigger } from "~/ui/components/ui/tabs";
import { VIEWS } from "~/ui/views";

/**
 * The strip of index tabs under the zigzag: one per view, the chosen one printed on the sheet.
 * The setup tab carries the recording light while a recording is live, so the fact is visible
 * from every other view; nothing else rides on a tab — a count would move the strip on every
 * push, and the view's own heading is the place for it.
 */
export const ViewTabs = ({ recording }: { recording: boolean }): ReactNode => (
  <TabsList aria-label="Views" data-slot="view-tabs">
    {VIEWS.map((view) => (
      <TabsTrigger key={view.id} value={view.id} data-view={view.id}>
        {view.label}
        {view.id === "setup" && recording && (
          <>
            <RecDot />
            <span className="sr-only">, recording</span>
          </>
        )}
      </TabsTrigger>
    ))}
  </TabsList>
);
