import KnexStore = require('../../index');

// Keep the legacy root declaration entry point usable.
const store = new KnexStore();
const ready: Promise<void> = store.ready;
void ready;
