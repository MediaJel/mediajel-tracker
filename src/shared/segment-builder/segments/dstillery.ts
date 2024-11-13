import logger from "src/shared/logger";
import { DstillerySegmentBuilderInput } from "src/shared/segment-builder/types";

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

        const pixel = document.createElement("img");
        pixel.src = `https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${siteVisitorNC}&ncv=76`;
        pixel.border = "0";
        document.body.appendChild(pixel);
    },

    emitPurchase: (input: DstilleryInput) => {
        const { orderId, amount } = input;

        if (!orderId || !amount || !purchaseNC) {
            console.warn("Missing required data for s3.tr");
            return;
        }

        logger.info("Emitting dstillery purchase event for segmentId: ", purchaseNC);

        const pixel = document.createElement("img");
        pixel.src = `https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${purchaseNC}&ncv=76&dstOrderId=${orderId}&dstOrderAmount=${amount}`;
        pixel.border = "0";
        document.body.appendChild(pixel);
    }
  };
}

export default DstillerySegmentBuilderInput;