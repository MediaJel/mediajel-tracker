import { NexxenSegmentBuilderInput } from "src/shared/segment-builder/types";

interface EmitPurchaseInput {
  cid: string;
  bprice: number;
}
const nexxenSegmentBuilder = (beacons: NexxenSegmentBuilderInput) => {
  const { pageVisitorBeaconId, transactionBeaconId } = beacons;
  return {
    emit: () => {
      if (!pageVisitorBeaconId) return;
      console.log("Building s2 segment with segmentId: ", pageVisitorBeaconId);

      const pixel = document.createElement("img");
      pixel.src = `https://r.turn.com/r/beacon?b2=${pageVisitorBeaconId}`;
      pixel.border = "0";
      document.body.appendChild(pixel);
    },

    emitPurchase: (input: EmitPurchaseInput) => {
      const { cid, bprice } = input;

      if (!cid || !bprice || !transactionBeaconId) {
        console.warn("Missing required data for s2.tr");
        return;
      }

      console.log("Emitting purchase event for segmentId: ", transactionBeaconId);

      const pixel = document.createElement("img");
      pixel.src = `https://r.turn.com/r/beacon?b2=${transactionBeaconId}&cid=${cid}&bprice=${bprice}`;
      pixel.border = "0";
      document.body.appendChild(pixel);
    },
  };
};

export default nexxenSegmentBuilder;
