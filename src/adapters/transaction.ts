import { SnowplowTracker } from "src/shared/snowplow";
import { EnvironmentEvents } from "src/shared/types";
import createEventsObservable from "src/shared/utils/create-events-observable";

const observable = createEventsObservable();

const makeTransactionsListener = (
  tracker: SnowplowTracker,
  observable: ReturnType<typeof createEventsObservable>,
  datasource: (events: Partial<EnvironmentEvents>) => void
): void => {
  observable.subscribe(({ transactionEvent, addToCartEvent, removeFromCartEvent }) => {});
};

export default async (tracker: SnowplowTracker): Promise<void> => {};
