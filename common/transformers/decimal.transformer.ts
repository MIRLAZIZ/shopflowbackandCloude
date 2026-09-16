// common/transformers/decimal.transformer.ts
// MySQL 'decimal' ustunlari TypeORM'da string qaytaradi — buni number'ga
// aylantirib beradigan umumiy transformer.
export const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};
