import { PercentPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { PERCENT_FORMAT } from '../../../core/constants/ui.constants';
import { BreakdownItem } from '../../../core/models/statistics.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** Ranked list with share bars; items that have children expand on tap. */
@Component({
  selector: 'app-breakdown-list',
  imports: [MoneyPipe, PercentPipe],
  templateUrl: './breakdown-list.html',
  styleUrl: './breakdown-list.scss',
})
export class BreakdownList {
  readonly items = input.required<readonly BreakdownItem[]>();
  readonly currency = input.required<string>();

  protected readonly percentFormat = PERCENT_FORMAT;
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  protected isExpanded(key: string): boolean {
    return this.expandedKeys().has(key);
  }

  protected toggle(item: BreakdownItem): void {
    if (!item.children.length) {
      return;
    }
    this.expandedKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(item.key)) {
        next.delete(item.key);
      } else {
        next.add(item.key);
      }
      return next;
    });
  }
}
