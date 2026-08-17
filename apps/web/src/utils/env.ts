export const parseBooleanEnvironmentValue = (value: string | undefined, name: string) => {
  if (value === undefined || value.trim() === '') return false;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new Error(`${name} must be either "true" or "false".`);
};
