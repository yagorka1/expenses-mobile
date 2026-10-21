import { Pipe, PipeTransform } from '@angular/core';
import { APP_LOCALE_TAG } from '../../core/constants/ui.constants';

const moneyFormatter = new Intl.NumberFormat(APP_LOCALE_TAG, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string): string {
    return amount === null || amount === undefined ? '' : `${moneyFormatter.format(amount)} ${currency}`;
  }
}
