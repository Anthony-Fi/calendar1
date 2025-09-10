import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Email from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/db"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
  logger: {
    error(code, metadata) {
      // eslint-disable-next-line no-console
      console.error('[next-auth][error]', code, metadata)
    },
    warn(code) {
      // eslint-disable-next-line no-console
      console.warn('[next-auth][warn]', code)
    },
    debug(code, metadata) {
      // eslint-disable-next-line no-console
      console.log('[next-auth][debug]', code, metadata)
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials: Partial<{ email: string; password: string }> | undefined) => {
        try {
          const email = credentials?.email?.toString().trim()
          const password = credentials?.password?.toString()
          if (!email || !password) return null
          const user = (await prisma.user.findUnique({ where: { email } })) as any
          if (!user || !user.passwordHash) return null
          const ok = await compare(password, user.passwordHash as string)
          if (!ok) return null
          return { id: user.id, email: user.email, name: user.name, role: user.role }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[auth][authorize] error', e)
          return null
        }
      },
    }),
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      // Optionally customize email:
      // sendVerificationRequest: async ({ identifier, url, provider, theme }) => { ... }
    }),
  ],
  callbacks: {
    async session({ session, token, user }: any) {
      if (session?.user) {
        ;(session.user as any).role = (user?.role ?? token?.role ?? (session.user as any).role)
        ;(session.user as any).id = (user?.id ?? token?.sub ?? (session.user as any).id)
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
  },
}
