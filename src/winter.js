export function isWinterActive(override, date = new Date()) {
  if (override === true) {
    return true;
  }

  if (override === false) {
    return false;
  }

  return date.getMonth() === 11;
}
