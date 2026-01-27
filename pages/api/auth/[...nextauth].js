import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          console.log('🔐 Google Sign In attempt:', user.email);
          await connectDB();

          let dbUser = await User.findOne({ email: user.email.toLowerCase() });

          if (!dbUser) {
            console.log('👤 Creating new user:', user.email);
            dbUser = await User.create({
              name: user.name,
              email: user.email.toLowerCase(),
              googleId: profile.sub,
              role: 'member',
              nativeLanguage: 'vi',
              level: 'beginner',
              isGoogleUser: true
            });
            console.log('✅ User created successfully:', dbUser._id);
          } else if (!dbUser.googleId) {
            console.log('🔄 Updating existing user with Google ID:', user.email);
            dbUser.googleId = profile.sub;
            dbUser.isGoogleUser = true;
            await dbUser.save();
            console.log('✅ User updated successfully');
          } else {
            console.log('✅ Existing Google user found:', user.email);
          }

          return true;
        } catch (error) {
          console.error('❌ Error in signIn callback:', error);
          console.error('Error details:', error.message);
          if (error.errors) {
            console.error('Validation errors:', error.errors);
          }
          return false;
        }
      }

      // Apple Sign In
      if (account.provider === 'apple') {
        try {
          // Apple only sends email/name on FIRST sign-in, so fallback to profile
          const userEmail = user.email || profile?.email;
          console.log('🍎 Apple Sign In attempt:', { email: userEmail, sub: profile?.sub });

          if (!userEmail) {
            // Try to find user by Apple sub if no email
            await connectDB();
            const existingUser = await User.findOne({ appleId: profile?.sub });
            if (existingUser) {
              console.log('✅ Found existing Apple user by sub:', existingUser.email);
              return true;
            }
            console.error('❌ Cannot create new user: No email provided by Apple');
            return false;
          }

          await connectDB();
          let dbUser = await User.findOne({ email: userEmail.toLowerCase() });

          if (!dbUser) {
            console.log('👤 Creating new Apple user:', userEmail);
            dbUser = await User.create({
              name: user.name || userEmail.split('@')[0],
              email: userEmail.toLowerCase(),
              appleId: profile?.sub,
              role: 'member',
              nativeLanguage: 'vi',
              level: 'beginner',
              isAppleUser: true
            });
            console.log('✅ Apple user created successfully:', dbUser._id);
          } else if (!dbUser.appleId) {
            console.log('🔄 Linking Apple ID to existing user:', userEmail);
            dbUser.appleId = profile?.sub;
            dbUser.isAppleUser = true;
            await dbUser.save();
            console.log('✅ User updated with Apple ID successfully');
          } else {
            console.log('✅ Existing Apple user found:', userEmail);
          }

          return true;
        } catch (error) {
          console.error('❌ Error in Apple signIn callback:', error);
          console.error('Error details:', error.message);
          if (error.errors) {
            console.error('Validation errors:', error.errors);
          }
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email.toLowerCase() });

          if (dbUser) {
            token.userId = dbUser._id.toString();
            token.role = dbUser.role;
            token.customToken = generateToken({
              userId: dbUser._id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              nativeLanguage: dbUser.nativeLanguage,
              level: dbUser.level
            });
          }
        } catch (error) {
          console.error('Error in JWT callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.customToken = token.customToken;
      }
      return session;
    },
  },
  pages: {
    signOut: '/auth/login',
    error: '/auth/callback',
    newUser: '/auth/callback',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
