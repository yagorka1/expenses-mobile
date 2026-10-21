import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ROUTE_LINKS } from '../../core/constants/app-routes';

interface NavItem {
  link: string;
  label: string;
  /** SVG path data, 24x24 viewBox. */
  icon: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { link: ROUTE_LINKS.addExpense, label: 'Добавить', icon: 'M12 5v14M5 12h14' },
  { link: ROUTE_LINKS.expenses, label: 'Траты', icon: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
  { link: ROUTE_LINKS.statistics, label: 'Статистика', icon: 'M5 20V10M12 20V4M19 20v-7' },
];

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly items = NAV_ITEMS;
}
