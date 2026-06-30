import liquidmSegmentBuilder from "@mediajel/tracker-core/segment-builder/segments/liquidm";
import nexxenSegmentBuilder from "@mediajel/tracker-core/segment-builder/segments/nexxen";
import DstillerySegmentBuilderInput from "@mediajel/tracker-core/segment-builder/segments/dstillery";
import { SegmentBuilderInput } from "@mediajel/tracker-core/segment-builder/types";

const createSegments = (input: SegmentBuilderInput) => {
  const { liquidm, nexxen, dstillery } = input;

  return {
    nexxen: nexxenSegmentBuilder(nexxen as any),
    liquidm: liquidmSegmentBuilder(liquidm as any),
    dstillery: DstillerySegmentBuilderInput(dstillery as any),
  };
};

export default createSegments;
