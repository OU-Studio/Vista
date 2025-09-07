const bus = new EventTarget();
export const on   = (type, cb) => bus.addEventListener(type, cb);
export const off  = (type, cb) => bus.removeEventListener(type, cb);
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
