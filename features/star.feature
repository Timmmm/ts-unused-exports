Feature: import * / export *

Scenario: Import * marks `default` as unused
  Given file "a.ts" is
    """
    export const a = 1;
    export default 1;
    """
  And file "b.ts" is import * as all from './a';
  When analyzing "tsconfig.json"
  Then the result at a.ts is ["default"]

Scenario: Import * and default
  Given file "a.ts" is
    """
    export const a = 1;
    export default 1;
    """
  And file "b.ts" is import def, * as all from './a';
  When analyzing "tsconfig.json"
  Then the result is {}

Scenario: Export * from
  Given file "a.ts" is export const a = 1;
  And file "b.ts" is export * from './a';
  And file "c.ts" is import { a } from './b';
  When analyzing "tsconfig.json"
  Then the result is {}

Scenario: Export *, import only some
  Given file "a.ts" is
    """
    export const a = 1;
    export const b = 2;
    """
  And file "b.ts" is export * from './a';
  And file "c.ts" is import { a } from './b';
  When analyzing "tsconfig.json"
  Then the result is { "b.ts": ["b"] }