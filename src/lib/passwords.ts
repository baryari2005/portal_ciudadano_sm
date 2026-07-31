import bcrypt from "bcryptjs";
export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, hash: string) =>
  bcrypt.compare(p, hash);
