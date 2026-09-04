import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import {
  normalizeEmail,
  sessionCookieName,
  userIdFromEmail,
} from "@/lib/auth/session";

const cookie = sessionCookieName();

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
  ],
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: cookie,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    jwt({ token, user, profile }) {
      const email = user?.email ?? profile?.email ?? token.email;
      const name = user?.name ?? profile?.name ?? token.name;
      if (typeof email === "string" && email.includes("@")) {
        token.sub = userIdFromEmail(email);
        token.email = normalizeEmail(email);
        token.name =
          typeof name === "string" && name.trim()
            ? name.trim()
            : normalizeEmail(email);
      }
      delete token.picture;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = typeof token.email === "string" ? token.email : "";
        session.user.name = typeof token.name === "string" ? token.name : "";
        session.user.image = undefined;
      }
      return session;
    },
  },
});
