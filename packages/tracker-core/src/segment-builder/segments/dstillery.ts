import logger from "@mediajel/tracker-core/logger";
import { DstillerySegmentBuilderInput } from "@mediajel/tracker-core/segment-builder/types";
import createImagePixel from "@mediajel/tracker-core/utils/create-image-pixel";

interface DstilleryInput {
  orderId: string;
  amount: number;
}

const DstillerySegmentBuilderInput = (input: DstillerySegmentBuilderInput) => {
  const { siteVisitorNC, purchaseNC } = input;

  return {
    emit: () => {
      if (!siteVisitorNC) return;
      logger.info("Building s3 segment with segmentId: ", siteVisitorNC);

      const pix = createImagePixel(
        `https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${siteVisitorNC}&ncv=76`,
      );

      document.head.appendChild(pix);
    },

    emitPurchase: (input: DstilleryInput) => {
      const { orderId, amount } = input;

      if (!orderId || !amount || !purchaseNC) {
        logger.warn("Missing required data for s3.tr");
        return;
      }

      logger.info("Emitting dstillery purchase event for segmentId: ", purchaseNC);

      const pix = createImagePixel(
        `https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${purchaseNC}&ncv=76&dstOrderId=${orderId}&dstOrderAmount=${amount}`,
      );

      document.head.appendChild(pix);
    },
  };
};

export default DstillerySegmentBuilderInput;
