import { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface User {
    role: string;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    mustChangePassword: boolean;
  }
}
