export interface SegmentBuilderInput {
  liquidm: string | undefined;
  nexxen: NexxenSegmentBuilderInput | undefined;
}

export interface NexxenSegmentBuilderInput {
  /** Beacon ID used for tracking page visitors */
  pageVisitorBeaconId: string;
  /** Beacon ID used for tracking transactions */
  transactionBeaconId: string;
}
