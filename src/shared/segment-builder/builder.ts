import liquidmSegmentBuilder from "src/shared/segment-builder/segments/liquidm";
import nexxenSegmentBuilder from "src/shared/segment-builder/segments/nexxen";
import { SegmentBuilderInput } from "src/shared/segment-builder/types";

const createSegments = (input: SegmentBuilderInput) => {
  const { liquidm, nexxen } = input;

  return {
    nexxen: nexxenSegmentBuilder(nexxen),
    liquidm: liquidmSegmentBuilder(liquidm),
  };
};

export default createSegments;
