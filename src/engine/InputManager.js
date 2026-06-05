// Keyboard input helper — attach once per game component lifecycle.

export function createInputHandler(handlers = {}) {
  const map = {
    ArrowUp:    () => handlers.up?.(),
    ArrowDown:  () => handlers.down?.(),
    ArrowLeft:  () => handlers.left?.(),
    ArrowRight: () => handlers.right?.(),
    w: () => handlers.up?.(),
    s: () => handlers.down?.(),
    a: () => handlers.left?.(),
    d: () => handlers.right?.(),
    ' ':        () => handlers.action?.(),
    Enter:      () => handlers.confirm?.(),
    Escape:     () => handlers.pause?.(),
    p:          () => handlers.pause?.(),
    P:          () => handlers.pause?.(),
  };

  function onKeyDown(e) {
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  }

  return {
    attach() { window.addEventListener('keydown', onKeyDown); },
    detach() { window.removeEventListener('keydown', onKeyDown); },
  };
}
