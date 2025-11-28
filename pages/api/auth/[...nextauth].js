import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          console.log('🔐 Google Sign In attempt:', user.email);
          await connectDB();

          // Tìm hoặc tạo user
          let dbUser = await User.findOne({ email: user.email.toLowerCase() });

          if (!dbUser) {
            console.log('👤 Creating new user:', user.email);
            // Tạo user mới nếu chưa tồn tại
            dbUser = await User.create({
              name: user.name,
              email: user.email.toLowerCase(),
              googleId: profile.sub,
              role: 'member',  // Sửa từ 'user' thành 'member' để match schema
              nativeLanguage: 'vi',
              level: 'beginner', // Default level for new Google users
              // Không cần password cho Google login
              isGoogleUser: true
            });
            console.log('✅ User created successfully:', dbUser._id);
          } else if (!dbUser.googleId) {
            console.log('🔄 Updating existing user with Google ID:', user.email);
            // Cập nhật googleId nếu user đã tồn tại nhưng chưa có googleId
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
    // Don't set signIn page to allow direct Google OAuth redirect
    // signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/callback',
    newUser: '/auth/callback',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
