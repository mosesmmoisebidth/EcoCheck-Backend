export const KIGALI_DISTRICTS = ['GASABO', 'NYARUGENGE', 'KICUKIRO'];

export const normalizeName = (value: string | undefined | null): string =>
  (value ?? '').trim().toLowerCase();

export const KIGALI_DISTRICTS_LOWER = KIGALI_DISTRICTS.map((district) =>
  normalizeName(district),
);
