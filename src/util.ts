export enum Type {
  string,
  number,
  boolean
}

export function getEnv(name: string, type: Type): string | number | boolean | undefined {
  if (process.env[name]) {
    const val = process.env[name];
    if (type === Type.string) return val + '';
    if (type === Type.number) return +(val || '');
    if (type === Type.boolean) return val === 'true';
  }

  return undefined;
}