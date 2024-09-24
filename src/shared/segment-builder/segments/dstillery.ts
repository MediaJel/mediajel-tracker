import logger from "src/shared/logger";
import { DstillerySegmentBuilderInput } from "src/shared/segment-builder/types";

interface DstilleryInput {
    orderId: string;
    amount: number;
}

const DstillerySegmentBuilderInput = (input: DstillerySegmentBuilderInput) => {
  const { advertiser, siteVisitorNC, purchaseNC } = input;

  return {
    dist: () => {
        if (!siteVisitorNC) return;
        logger.info("Building s3 segment with segmentId: ", siteVisitorNC);

        // Ask if ncv is always 76
        const pixel = document.createElement("img");
        pixel.src = `//action.dstillery.com/orbserv/nsjs?adv=${advertiser}&nc=${siteVisitorNC}&ncv=76`;
        pixel.border = "0";
        document.body.appendChild(pixel);
    },

    distPurchase: (input: DstilleryInput) => {
        const { orderId, amount } = input;

        if (!orderId || !amount || !purchaseNC) {
            console.warn("Missing required data for s3.tr");
            return;
        }

        logger.info("Emitting dstillery purchase event for segmentId: ", purchaseNC);

        const pixel = document.createElement("img");
        pixel.src = `//action.dstillery.com/orbserv/nsjs?adv=${advertiser}&nc=${purchaseNC}&ncv=76&dstOrderId=${orderId}&dstOrderAmount=${amount}`;
        pixel.border = "0";
        document.body.appendChild(pixel);
    }
  };
}