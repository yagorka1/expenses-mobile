import { MoneyPipe } from './money.pipe';

/** The locale separates thousands with a no-break space. */
const plainSpaces = (value: string): string => value.replace(/\s/g, ' ');

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('shows cents with two digits', () => {
    expect(plainSpaces(pipe.transform(12.5, 'EUR'))).toBe('12,50 EUR');
  });

  it('leaves whole amounts without cents', () => {
    expect(plainSpaces(pipe.transform(1234, 'RSD'))).toBe('1 234 RSD');
  });

  it('shows nothing without an amount', () => {
    expect(pipe.transform(null, 'EUR')).toBe('');
  });
});
