export const STORAGE_KEYS = {
  lastCurrency: 'expenses.lastCurrency',
  lastPerson: 'expenses.lastPerson',
  statisticsCurrency: 'expenses.statisticsCurrency',
  /** `v2` also stores the day of the rates; the old entry is simply ignored. */
  exchangeRates: 'expenses.exchangeRates.v2',
  historicalRates: 'expenses.historicalRates',
  /** Set while the evening reminder is on for this device: its document id in `pushDevices`. */
  pushDeviceId: 'expenses.pushDeviceId',
} as const;
