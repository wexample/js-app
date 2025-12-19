import App from './App';
import AppChild from './AppChild';

export default abstract class AppService extends AppChild {
  public app: App;
  public static dependencies: typeof AppService[] = [];

  registerHooks(): { app?: {}; page?: {}, renderNode?: {} } {
    return {};
  }

  registerMethods(object: any, group: string) {
    return {};
  }
}
