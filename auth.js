import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import {
  completeSuccessfulSignIn,
  findActiveAllowedUser,
  findAllowedUserByEmail,
  findSignInAllowedUser,
  normalizeEmail,
} from "./lib/auth/allowlist";
import { STATUS } from "./lib/auth/user-labels";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/access-denied",
  },
  callbacks: {
    async signIn({ user, profile }) {
      try {
        const email = normalizeEmail(user?.email || profile?.email);
        if (!email) return "/access-denied?reason=not_allowed";

        const allowed = await findSignInAllowedUser(email);
        if (!allowed) {
          const existing = await findAllowedUserByEmail(email);
          if (existing?.status === STATUS.INACTIVE) {
            return "/access-denied?reason=inactive";
          }
          return "/access-denied?reason=not_allowed";
        }

        await completeSuccessfulSignIn(allowed);
        return true;
      } catch (error) {
        console.error("Allowlist sign-in check failed", error);
        return "/access-denied?reason=error";
      }
    },
    async jwt({ token, user, profile, trigger }) {
      const shouldLoad =
        Boolean(user) || trigger === "signIn" || trigger === "update";
      if (!shouldLoad && token.role && !token.allowlistDenied) {
        return token;
      }

      const email = normalizeEmail(
        user?.email || profile?.email || token.email
      );
      if (!email) {
        token.allowlistDenied = true;
        token.role = null;
        token.allowlistId = null;
        return token;
      }

      try {
        const allowed = await findActiveAllowedUser(email);
        if (!allowed) {
          const existing = await findAllowedUserByEmail(email);
          token.allowlistDenied = true;
          token.denyReason =
            existing?.status === STATUS.INACTIVE ? "inactive" : "not_allowed";
          token.role = null;
          token.allowlistId = null;
          token.fullName = null;
          token.email = email;
          return token;
        }
        token.allowlistDenied = false;
        token.denyReason = null;
        token.email = allowed.email;
        token.role = allowed.role;
        token.allowlistId = allowed.id;
        token.fullName = allowed.fullName;
        token.name = allowed.fullName;
      } catch (error) {
        console.error("Allowlist JWT enrichment failed", error);
        token.allowlistDenied = true;
        token.denyReason = "error";
        token.role = null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.allowlistDenied || !token.role) {
        return {
          ...session,
          user: null,
          error: "NotAllowlisted",
          denyReason: token.denyReason || "not_allowed",
        };
      }
      session.user = {
        ...session.user,
        email: token.email,
        name: token.fullName || token.name,
        role: token.role,
        allowlistId: token.allowlistId,
      };
      return session;
    },
  },
});
