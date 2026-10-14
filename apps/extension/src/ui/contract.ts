import { WidgetGoal } from "@mediajel/assistant-core/types";

import { Settings } from "~/store/settings";
import { TargetState } from "~/ui/screens/DeploySection";

/**
 * The contract between the hook that owns the panel's state and every screen that renders it:
 * what a screen can ask the panel to do, and the view state the panel keeps outside the persisted
 * session. Kept apart from App.tsx so a view can import these types without importing the panel
 * that composes it.
 */

/** The job's name, said once under the site. */
export const JOB_TITLES: Record<WidgetGoal, string> = {
  transaction: "Transaction tag",
  signup: "Sign-up tag",
};

export interface AppHandlers {
  onStartRecording(goal: WidgetGoal): void;
  onStopRecording(): void;
  onDiscard(): void;
  onToggleMark(id: string): void;
  onNotes(notes: string): void;
  onBackToRecording(): void;
  onGenerate(): void;
  onCancelGenerate(): void;
  onRegenerate(): void;
  onCodeEdit(code: string): void;
  onRechoose(): void;
  onEvidenceMode(mode: "suggest" | "pinpoint"): void;
  onVerify(): void;
  onVerifyRunAgain(): void;
  onBackToCode(): void;
  onApproveVerify(): void;
  onSelectTarget(kind: "domain" | "app-id"): void;
  onDeploy(): void;
  onStartAnother(): void;
  onRequestReset(): void;
  onConfirmReset(): void;
  onCancelReset(): void;
  onCheckAccess(): void;
  onSettingsPatch(patch: Partial<Settings>): void;
  onSignOut(): void;
  onClearDedup(): void;
  onClearAllJobs(): void;
  onOpenJobs(): void;
}

/**
 * Whether this account may deploy the page's tag, asked once the tag is known rather than at the
 * end of a job: a refusal found after an hour of recording is a worse refusal than the same one
 * found at the start. The reason is the service's own sentence and is shown as it arrives.
 */
export interface TagAccessState {
  /** The tag the answer is about; "" before any tag is known. */
  appId: string;
  status: "idle" | "checking" | "allowed" | "refused";
  /** Empty unless refused. */
  reason: string;
  /** The org the directory named as the tag's owner, when it named one — who to ask. */
  org?: { id: string; name: string };
}

/** Verify/deploy view state the panel owns outside the persisted session. */
export interface AppFlowState {
  verifyRunErrors: string[];
  deploy: {
    targets: { domain: TargetState; appId: TargetState | null };
    selected: "domain" | "app-id";
    deploying: boolean;
    deployError: string;
    deployBlocked: string;
    cdnState: "idle" | "waiting" | "live" | "gave-up";
  };
}
