import { QueryStringContext } from "/src/shared/types";
import { SnowplowTracker } from "/src/snowplow";

interface UseCaseInput {
  tracker: SnowplowTracker;
  ctx: QueryStringContext;
}

const importTransactionUseCase = async ({ tracker, ctx }: UseCaseInput): Promise<void> => {
  const { default: useCase } = await import("/src/use-cases/transaction/set-transaction-environment");
  useCase({ tracker, ctx });
};

const importImpressionUseCase = async ({ tracker, ctx }: UseCaseInput): Promise<void> => {
  const { default: useCase } = await import("/src/use-cases/impression/set-impression-environment");
  return useCase({ tracker, ctx });
};

const importSignupUseCase = async ({ tracker, ctx }: UseCaseInput): Promise<void> => {
  const { default: useCase } = await import("/src/use-cases/signup/set-signup-environment");
  return useCase({ tracker, ctx });
};

const setUseCase = async (input: UseCaseInput) => {
  const { tracker, ctx } = input;

  if (!ctx.environment && !ctx.event) {
    console.warn("No event/environment specified, Only pageview is active");
    return;
  }

  switch (ctx.event) {
    case "transaction":
      return await importTransactionUseCase({ tracker, ctx });
    case "impression":
      return await importImpressionUseCase({ tracker, ctx });
    case "signup":
      return await importSignupUseCase({ tracker, ctx });
    default:
      console.warn(`No event specified, Loading ${ctx.environment} environment instead.`);
      return await importTransactionUseCase({ tracker, ctx });
  }
};

export default setUseCase;
