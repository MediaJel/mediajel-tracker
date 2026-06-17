export interface SegmentBuilderInput {
  liquidm: string | undefined;
  nexxen: NexxenSegmentBuilderInput | undefined;
  dstillery: DstillerySegmentBuilderInput | undefined;
}

export interface NexxenSegmentBuilderInput {
  /** Beacon ID used for tracking page visitors */
  pageVisitorBeaconId: string;
  /** Beacon ID used for tracking transactions */
  transactionBeaconId: string;
}

export interface DstillerySegmentBuilderInput {
  // Dstillery Tag Site Visitor
  siteVisitorNC: string;
  // Dstillery Tag Purchase
  purchaseNC: string;
}