export function readEnvValue(value?: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function envToBool(value?: string, defaultValue = false): boolean {
  const cleaned = readEnvValue(value);
  if (!cleaned) {
    return defaultValue;
  }
  const normalized = cleaned.toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

export function envToNumber(value?: string, defaultValue = 0): number {
  const cleaned = readEnvValue(value);
  if (!cleaned) {
    return defaultValue;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function parseDurationToSeconds(value?: string, fallbackSeconds = 0): number {
  if (!value) {
    return fallbackSeconds;
  }
  const cleaned = value.split('#')[0].trim();
  if (!cleaned) {
    return fallbackSeconds;
  }
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([smhd])?$/i);
  if (!match) {
    return fallbackSeconds;
  }
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const multiplier =
    unit === 'm'
      ? 60
      : unit === 'h'
        ? 60 * 60
        : unit === 'd'
          ? 60 * 60 * 24
          : 1;
  return Math.round(amount * multiplier);
}
