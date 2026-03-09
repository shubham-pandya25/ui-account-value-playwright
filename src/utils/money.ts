export function parseMoney(input: string): number {
  const numeric = input.replace(/[^\d.,-]/g, '');

  if (!numeric) {
    throw new Error(`Unable to find digits in value: ${input}`);
  }

  const normalized = numeric.includes(',') && numeric.includes('.')
    ? numeric.replace(/,/g, '')
    : numeric.replace(/,/g, '');

  return Number.parseFloat(normalized);
}