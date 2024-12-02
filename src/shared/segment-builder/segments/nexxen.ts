import logger from "src/shared/logger";
import { NexxenSegmentBuilderInput } from "src/shared/segment-builder/types";
import createImagePixel from "src/shared/utils/create-image-pixel";

interface EmitPurchaseInput {
  cid: string;
  bprice: number;
}
const nexxenSegmentBuilder = (beacons: NexxenSegmentBuilderInput) => {
  const { pageVisitorBeaconId, transactionBeaconId } = beacons;
  return {
    emit: () => {
      if (!pageVisitorBeaconId) return;
      logger.info("Building s2 segment with segmentId: ", pageVisitorBeaconId);

      const pix = createImagePixel(`https://r.turn.com/r/beacon?b2=${pageVisitorBeaconId}`);
      document.body.appendChild(pix);
    },

    emitPurchase: (input: EmitPurchaseInput) => {
      const { cid, bprice } = input;

      if (!cid || !bprice || !transactionBeaconId) {
        console.warn("Missing required data for s2.tr");
        return;
      }

      logger.info("Emitting purchase event for segmentId: ", transactionBeaconId);

      const pix = createImagePixel(`https://r.turn.com/r/beacon?b2=${transactionBeaconId}&cid=${cid}&bprice=${bprice}`);

      document.body.appendChild(pix);
    },
  };
};

export default nexxenSegmentBuilder;
