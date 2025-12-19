import App from './App';
import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';

export default class extends AsyncConstructor {
  constructor(protected readonly app: App) {
    super();

    this.app = app;
  }
}
