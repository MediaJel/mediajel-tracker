import logger from "@mediajel/tracker-core/logger";
import { NexxenSegmentBuilderInput } from "@mediajel/tracker-core/segment-builder/types";
import createImagePixel from "@mediajel/tracker-core/utils/create-image-pixel";

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
      document.head.appendChild(pix);
    },

    emitPurchase: (input: EmitPurchaseInput) => {
      const { cid, bprice } = input;

      if (!cid || !bprice || !transactionBeaconId) {
        logger.warn("Missing required data for s2.tr");
        return;
      }

      logger.info("Emitting purchase event for segmentId: ", transactionBeaconId);

      const pix =createImagePixel(`https://r.turn.com/r/beacon?b2=${transactionBeaconId}&cid=${cid}&bprice=${bprice}`);
      document.head.appendChild(pix);
    },
  };
};

export default nexxenSegmentBuilder;
