import type App from '../Common/App';
import type AppService from '../Common/AppService';

export type AppServiceConstructor = (new (
  app: App,
  ...args: unknown[]
) => AppService) & {
  serviceName: string;
  dependencies?: ServiceDefinition[];
};

export type ServiceDefinition = AppServiceConstructor | [AppServiceConstructor, unknown[]];
