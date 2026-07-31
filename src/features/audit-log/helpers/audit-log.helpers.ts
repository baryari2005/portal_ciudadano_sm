import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

const SENSITIVE_FIELDS = new Set(["password","passwordhash","token","tokenhash","qrtoken","qrhash","storagepath","signedurl","sha256","cookie","authorization","secret","content","archivo","directurl","databaseurl"]);
const normalize = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return sanitizeAuditData(value as Record<string,unknown>);
  return value;
};
export function sanitizeAuditData(value: unknown, depth=0): unknown {
  if (depth > 5) return "[contenido omitido]";
  if (Array.isArray(value)) return value.slice(0,100).map((item)=>sanitizeAuditData(item,depth+1));
  if (!value || typeof value !== "object") return typeof value === "string" ? value.slice(0,1000) : value;
  return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key])=>!SENSITIVE_FIELDS.has(key.toLowerCase())).map(([key,item])=>[key,sanitizeAuditData(item,depth+1)]));
}
export function buildAuditChanges(before:Record<string,unknown>,after:Record<string,unknown>,allowedFields:string[]){return Object.fromEntries(allowedFields.filter((field)=>field!=="updatedAt").map((field)=>[field,{before:normalize(before[field]),after:normalize(after[field])}]).filter(([,change])=>JSON.stringify((change as {before:unknown}).before)!==JSON.stringify((change as {after:unknown}).after)));}
export function hashAuditIp(ip?:string|null){const salt=process.env.AUDIT_IP_SALT;if(!ip||!salt)return null;return createHash("sha256").update(`${salt}:${ip}`).digest("hex");}
export function getAuditRequestContext(headers:Headers){const forwarded=headers.get("x-forwarded-for")?.split(",")[0]?.trim();return{ip:forwarded||headers.get("x-real-ip"),userAgent:headers.get("user-agent")?.slice(0,300)??null};}
