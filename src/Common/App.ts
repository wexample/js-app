import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';

export default class App extends AsyncConstructor {
  constructor(
    globalName: string = 'app'
  ) {
    super();

    window[globalName] = this;

    let doc = window.document;

    let run = async () => {
      console.log('OK!');

      // Every core properties has been set,
      // block any try to add extra property.
      this.seal();
    };

    let readyState = doc.readyState;

    // Document has been parsed.
    // Allows running after loaded event.
    if (['complete', 'loaded', 'interactive'].indexOf(readyState) !== -1) {
      this.defer(run);
    } else {
      doc.addEventListener('DOMContentLoaded', run);
    }
  }
}
