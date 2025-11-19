import { v4 as uuidv4 } from "uuid";
import { customAlphabet } from "nanoid";

const alphanumeric = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoidAlphanumeric = customAlphabet(alphanumeric);

export function generateUUID(): string {
	return uuidv4();
}
export function generateNanoid(length: number = 10): string {
	return nanoidAlphanumeric(length);
}