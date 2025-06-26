// Test file to verify changes are loading
export const FINANCIALS_TEST_VERSION = "v3-with-fixes";

export const testChanges = {
  quarterlyHeaders: true,
  differentDataForFYvsQTR: true,
  fixedColumnMinWidth: "200px",
  improvedShadow: "4px_0_8px_-2px",
  timestamp: new Date().toISOString()
};

console.log("FINANCIALS CHANGES LOADED:", testChanges);