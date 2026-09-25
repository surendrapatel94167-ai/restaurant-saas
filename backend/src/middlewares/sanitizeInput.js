// Recursively strips any object key starting with "$" or containing "."
// (the two things that let a crafted request body/query manipulate a
// MongoDB query — e.g. { "email": { "$gt": "" } }). Mutates in place.
function clean(value) {
  if (Array.isArray(value)) {
    value.forEach(clean);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
        continue;
      }
      clean(value[key]);
    }
  }
  return value;
}

export default function sanitizeInput() {
  return (req, res, next) => {
    if (req.body) clean(req.body);
    // req.query/req.params are mutated in place, never reassigned — Express
    // 4.19+ made req.query a getter-only property, and express-mongo-sanitize
    // crashes on every request trying to do `req.query = ...`.
    if (req.query) clean(req.query);
    if (req.params) clean(req.params);
    next();
  };
}