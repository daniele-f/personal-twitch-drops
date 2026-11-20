// jsdom does not implement native dialog methods. These stubs only expose the
// API boundary; native focus containment and inertness need manual browser QA.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}
