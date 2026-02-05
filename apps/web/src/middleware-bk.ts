// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const protectedPaths = [
  '/api/admin/users',
  '/api/admin/wallets',
  // Thêm các route admin khác cần bảo vệ
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chỉ bảo vệ các route bắt đầu bằng /api/admin/
  if (!pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; email: string };

    // Optional: Attach user info to request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.id.toString());
    requestHeaders.set('x-user-email', decoded.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
}

export const config = {
  matcher: '/api/admin/:path*',
};
