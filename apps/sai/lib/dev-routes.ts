export function areDevRoutesEnabled() {
  if (process.env.SAI_ENABLE_DEV_ROUTES === "true") {
    return true;
  }

  if (process.env.SAI_ENABLE_DEV_ROUTES === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
