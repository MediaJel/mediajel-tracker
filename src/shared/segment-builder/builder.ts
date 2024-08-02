import { buildLiquidmSegment } from "src/shared/segment-builder/segments/liquidm";
import { SegmentBuilderInput } from "src/shared/segment-builder/types";

const createSegments = (input: SegmentBuilderInput) => {
  const { liquidm, nexxen } = input;

  liquidm && buildLiquidmSegment(liquidm);
  nexxen && null;
};

export default createSegments;
