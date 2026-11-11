// Just enough of Node's test runner types for the domain tests to typecheck
// (the app has no @types/node; the tests run with `npm test` in plain Node).
declare module "node:test" {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}
declare module "node:assert/strict" {
  type Check = RegExp | ((e: unknown) => boolean);
  const assert: {
    (value: unknown, message?: string): asserts value;
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: unknown, expected: T, message?: string): asserts actual is T;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual<T>(actual: unknown, expected: T, message?: string): asserts actual is T;
    throws(fn: () => unknown, check?: Check, message?: string): void;
    rejects(fn: Promise<unknown> | (() => Promise<unknown>), check?: Check, message?: string): Promise<void>;
    match(value: string, re: RegExp, message?: string): void;
    doesNotMatch(value: string, re: RegExp, message?: string): void;
  };
  export default assert;
}
