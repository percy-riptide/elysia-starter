import type { User, Session } from "better-auth/types";

export interface AuthContext {
  user: User;
  session: Session;
}