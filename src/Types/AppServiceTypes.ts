import type App from '../Common/App.js';
import type AppService from '../Common/AppService.js';

export type AppServiceConstructor = (new (
  app: App,
  ...args: unknown[]
) => AppService) & {
  serviceName: string;
  dependencies?: ServiceDefinition[];
};

export type ServiceDefinition = AppServiceConstructor | [AppServiceConstructor, unknown[]];
