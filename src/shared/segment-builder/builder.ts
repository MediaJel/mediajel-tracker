import liquidmSegmentBuilder from "src/shared/segment-builder/segments/liquidm";
import nexxenSegmentBuilder from "src/shared/segment-builder/segments/nexxen";
import DstillerySegmentBuilderInput from "src/shared/segment-builder/segments/dstillery";
import { SegmentBuilderInput } from "src/shared/segment-builder/types";

const createSegments = (input: SegmentBuilderInput) => {
  const { liquidm, nexxen, dstillery } = input;

  return {
    nexxen: nexxenSegmentBuilder(nexxen),
    liquidm: liquidmSegmentBuilder(liquidm),
    dstillery: DstillerySegmentBuilderInput(dstillery),
  };
};

export default createSegments;
