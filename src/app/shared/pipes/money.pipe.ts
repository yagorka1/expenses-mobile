import { Pipe, PipeTransform } from '@angular/core';
import { APP_LOCALE_TAG } from '../../core/constants/ui.constants';
import { roundMoney } from '../../core/utils/currency.utils';

const wholeFormatter = new Intl.NumberFormat(APP_LOCALE_TAG, { maximumFractionDigits: 0 });
/** Cents always take two digits: "12,50", not "12,5". */
const centsFormatter = new Intl.NumberFormat(APP_LOCALE_TAG, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string): string {
    if (amount === null || amount === undefined) {
      return '';
    }
    const rounded = roundMoney(amount);
    const formatter = Number.isInteger(rounded) ? wholeFormatter : centsFormatter;
    return `${formatter.format(rounded)} ${currency}`;
  }
}
