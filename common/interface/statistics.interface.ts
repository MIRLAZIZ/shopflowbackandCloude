interface CreateOrUpdateStatsInput {
  userId: number;
  productId: number;

  totalSales: number;      // sotuv summasi
  quantity: number;        // sotilgan dona
  discount: number;        // chegirma
  profit: number;          // REAL profit
  // total_transactions: number;
}
