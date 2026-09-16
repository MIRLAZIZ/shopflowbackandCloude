export class OrderItemResponseDto {
  id!: number;
  quantity!: number;
  selling_price!: number;
  purchase_price?: number;
  discount!: number;
  total!: number;
  product!: {
    id: number;
    name: string;
  };
}

export class OrderResponseDto {
  id!: number;
  subtotal!: number;
  discount!: number;
  total!: number;
  paidAmount!: number;
  debtAmount!: number;
  paymentType!: string;
  paymentBreakdown!: { type: string; amount: number }[] | null;
  customerId!: number | null;
  status!: string;
  createdAt!: Date;
  updatedAt?: Date;
  items!: OrderItemResponseDto[];
  user?: {
    id: number;
    name: string;
  };
}
