declare module '@playwright/test' {
  export interface Locator {
    toBeVisible(): Promise<boolean>;
    first(): Locator;
    last(): Locator;
    nth(index: number): Locator;
    or(locator: Locator): Locator;
  }

  export interface Page {
    goto(url: string): Promise<unknown>;
    locator(selector: string): Locator;
  }

  export interface PlaywrightTestArgs {
    page: Page;
  }

  export interface TestOptions {
    (name: string, fn: (args: PlaywrightTestArgs) => Promise<void> | void): void;
    describe(name: string, fn: () => void): void;
  }

  export interface ExpectMatcher {
    toHaveTitle(titleOrRegex: string | RegExp): Promise<void>;
    toBeVisible(): Promise<void>;
  }

  export const test: TestOptions;
  export const expect: (actual: any) => ExpectMatcher;
}
