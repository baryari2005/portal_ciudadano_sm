import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);

const defaultExp = process.env.JWT_EXPIRES || "8h";

export type JwtPayload = {
  uid: string | number;
  rid?: string | number;
  rname?: string;
};

export async function signJwt(payload: JwtPayload, exp: string = defaultExp) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
