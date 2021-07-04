import {
  DisplayProcessor,
  SpecReporter,
  StacktraceOption,
} from 'jasmine-spec-reporter';

class CustomProcessor extends DisplayProcessor {
  public displayJasmineStarted( // eslint-disable-line
    info: jasmine.JasmineStartedInfo,
    log: string,
  ): string {
    return `TypeScript ${log}`;
  }
}

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: {
      displayStacktrace: StacktraceOption.NONE,
    },
    customProcessors: [CustomProcessor],
  }),
);
