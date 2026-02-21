export function authContext(req, _res, next) {
  const userIdHeader = req.header("x-user-id");
  const roleHeader = req.header("x-user-role");
  const parsedUserId = Number(userIdHeader);

  req.auth = {
    userId: Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null,
    role: roleHeader || "USER",
  };

  next();
}