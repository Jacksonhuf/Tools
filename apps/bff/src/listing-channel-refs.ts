/** Channel marketplace item IDs for demo listings (P3-E2 publish / P1-E2 sync). */
export const LISTING_CHANNEL_EXTERNAL_REFS: Record<string, string> = {
  "listing-ml-001": "MLM123456",
  "listing-amz-001": "B0TEST123",
};

export function resolveListingExternalRef(listingId: string): string {
  return LISTING_CHANNEL_EXTERNAL_REFS[listingId] ?? listingId;
}
