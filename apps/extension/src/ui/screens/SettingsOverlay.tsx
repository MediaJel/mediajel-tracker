import { ReactNode } from "react";

import type { Identity } from "~/auth/cognito";
import type { SiteSimulation } from "@mediajel/assistant-core/simulation";
import { Settings, ThemeChoice } from "~/store/settings";
import { Definitions } from "~/ui/components/Definitions";
import { Eyebrow, Fine, SectionBody, SectionFooter } from "~/ui/components/Section";
import { Button } from "~/ui/components/ui/button";
import { Checkbox } from "~/ui/components/ui/checkbox";
import { FieldLegend, FieldSet } from "~/ui/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/ui/toggle-group";

/**
 * Settings — reachable from anywhere, leaves the step untouched.
 *
 * There is no credential on this screen. That is the point of the whole rebuild: the account
 * is the account you already have, the deploy token lives in the service, and what is left is
 * three genuine preferences and two things it is occasionally useful to destroy.
 */

export interface SettingsOverlayProps {
  identity: Identity | null;
  settings: Settings;
  appId: string;
  access: { status: "idle" | "checking" | "ok" | "error"; message: string };
  /** Every tag simulated in this browser. */
  simulations: SiteSimulation[];
  onRemoveSimulation(site: string): void;
  onCheckAccess(): void;
  onPatch(patch: Partial<Settings>): void;
  onSignOut(): void;
  onClearDedup(): void;
  onClearAllJobs(): void;
  onClose(): void;
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** The two facts about the account, in mono because they are the machine's names for a person. */
const WhoAmI = ({ identity }: { identity: Identity }): ReactNode => {
  const entries: [string, ReactNode][] = [
    ["Name", <span className="font-mono">{identity.name || identity.username}</span>],
  ];
  if (identity.email) entries.push(["Email", <span className="font-mono">{identity.email}</span>]);
  return <Definitions entries={entries} className="grid-cols-[auto_1fr] [&_dd]:text-left" />;
};

const AccessMessage = ({ access }: Pick<SettingsOverlayProps, "access">): ReactNode => {
  if (access.status === "ok") {
    return (
      <span className="text-platform-text" role="status">
        {access.message}
      </span>
    );
  }
  if (access.status === "error") {
    return (
      <span className="text-warning-text" role="alert">
        {access.message}
      </span>
    );
  }
  return null;
};

/** "Check access": the session is accepted and the service is configured. No model spend. */
const AccessCheck = ({
  identity,
  access,
  onCheckAccess,
}: Pick<SettingsOverlayProps, "identity" | "access" | "onCheckAccess">) => {
  const checking = access.status === "checking";
  const canCheck = Boolean(identity) && !checking;
  return (
    <div className="-mt-0.5 mb-3 flex flex-wrap items-center gap-2 text-sm">
      <Button type="button" variant="outline" aria-disabled={!canCheck} onClick={canCheck ? onCheckAccess : undefined}>
        {checking ? "Checking…" : "Check access"}
      </Button>
      <AccessMessage access={access} />
    </div>
  );
};

const Account = (
  props: Pick<SettingsOverlayProps, "identity" | "access" | "settings" | "onCheckAccess" | "onPatch">,
) => (
  <FieldSet>
    <FieldLegend>Account</FieldLegend>
    {props.identity ? <WhoAmI identity={props.identity} /> : <Fine>Nobody is signed in.</Fine>}
    <AccessCheck identity={props.identity} access={props.access} onCheckAccess={props.onCheckAccess} />
    <Fine>
      Deploys commit to master of the frictionless repo as “Created by: you” and go live after its CI. MediaJel holds
      the deploy credential — there is no token for you to keep.
    </Fine>
    <label className="mb-2.5 flex cursor-pointer items-start gap-2 text-sm">
      <Checkbox
        checked={props.settings.acknowledgedDataSharing}
        onCheckedChange={(checked) => props.onPatch({ acknowledgedDataSharing: checked === true })}
      />
      <span>
        I understand Generate sends the pinned events, the compressed timeline and this page’s context (masked) to
        MediaJel’s assistant service, which hands them to the model.
      </span>
    </label>
  </FieldSet>
);

const Appearance = ({ settings, onPatch }: Pick<SettingsOverlayProps, "settings" | "onPatch">): ReactNode => (
  <FieldSet>
    <FieldLegend>Appearance</FieldLegend>
    <ToggleGroup
      type="single"
      value={settings.theme}
      onValueChange={(value) => (value ? onPatch({ theme: value as ThemeChoice }) : undefined)}
      aria-label="Theme"
    >
      {THEMES.map((theme) => (
        <ToggleGroupItem key={theme.value} value={theme.value}>
          {theme.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </FieldSet>
);

/** What this page carries, said before the two things that can be done to it. */
const pageLine = (appId: string): string =>
  appId
    ? `The MediaJel tag is on this page (appId ${appId}).`
    : "There is no MediaJel tag on this page. Simulate one from the Overview to record and verify before the client installs it.";

const ThisPage = ({ appId, onClearDedup }: Pick<SettingsOverlayProps, "appId" | "onClearDedup">): ReactNode => (
  <FieldSet>
    <FieldLegend>This page</FieldLegend>
    <Fine>{pageLine(appId)}</Fine>
    <div className="my-1 flex flex-wrap gap-2">
      <Button type="button" variant="outline" aria-disabled={!appId} onClick={appId ? onClearDedup : undefined}>
        Clear tracker dedup state
      </Button>
    </div>
    {appId ? <Fine>Dedup clear removes localStorage “{appId}_*”, so repeated test orders fire again.</Fine> : null}
  </FieldSet>
);

/** Every tag simulated in this browser, so none is ever forgotten on a site: where, which, and a way to remove it. */
const Simulations = ({
  simulations,
  onRemoveSimulation,
}: Pick<SettingsOverlayProps, "simulations" | "onRemoveSimulation">): ReactNode =>
  simulations.length > 0 ? (
    <div data-slot="simulations" className="mb-2.5">
      <Eyebrow className="mb-1 block">Simulated tags</Eyebrow>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {simulations.map((simulation) => (
          <li key={simulation.site} className="flex items-baseline gap-2">
            <span className="min-w-0 truncate text-base text-foreground">{simulation.site}</span>
            <span className="flex-none text-xs text-muted-foreground">
              {simulation.enabled ? "simulating" : "paused"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="ml-auto"
              aria-label={`Remove the simulated tag on ${simulation.site}`}
              onClick={() => onRemoveSimulation(simulation.site)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

const ThisBrowser = ({
  simulations,
  onRemoveSimulation,
  onClearAllJobs,
  onSignOut,
}: Pick<SettingsOverlayProps, "simulations" | "onRemoveSimulation" | "onClearAllJobs" | "onSignOut">) => (
  <FieldSet>
    <FieldLegend>This browser</FieldLegend>
    <Simulations simulations={simulations} onRemoveSimulation={onRemoveSimulation} />
    <div className="my-1 flex flex-wrap gap-2">
      <Button type="button" variant="destructive" onClick={onClearAllJobs}>
        Delete every saved job
      </Button>
      <Button type="button" variant="destructive" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
    <Fine>
      Saved jobs hold recordings of the sites you worked on. Deleting them cannot be undone; signing out leaves them
      where they are.
    </Fine>
  </FieldSet>
);

export const SettingsOverlay = (props: SettingsOverlayProps): ReactNode => (
  <SectionBody className="overflow-y-auto" aria-label="Assistant settings">
    <h3 className="mt-0 mb-2.5 font-display text-sm font-bold tracking-label uppercase">Settings</h3>
    <Account {...props} />
    <Appearance settings={props.settings} onPatch={props.onPatch} />
    <ThisPage appId={props.appId} onClearDedup={props.onClearDedup} />
    <ThisBrowser
      simulations={props.simulations}
      onRemoveSimulation={props.onRemoveSimulation}
      onClearAllJobs={props.onClearAllJobs}
      onSignOut={props.onSignOut}
    />
    <SectionFooter>
      <Button type="button" onClick={props.onClose}>
        Done
      </Button>
    </SectionFooter>
  </SectionBody>
);

export default SettingsOverlay;
