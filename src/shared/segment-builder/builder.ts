import { buildLiquidmSegment } from "src/shared/segment-builder/segments/liquidm";
import { buildNexxenSegment } from "src/shared/segment-builder/segments/nexxen";
import { SegmentBuilderInput } from "src/shared/segment-builder/types";

const createSegments = (input: SegmentBuilderInput) => {
  const { liquidm, nexxen } = input;

  liquidm && buildLiquidmSegment(liquidm);
  nexxen && buildNexxenSegment(nexxen);
};

export default createSegments;
