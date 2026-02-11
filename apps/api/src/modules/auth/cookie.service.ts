import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get<string>('app.nodeEnv') === 'production';
  }

  /** Set all auth cookies (access token, refresh token, auth flag). */
  setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string): void {
    const r = reply as any;

    // Access token — httpOnly, sent with every request
    r.setCookie('csfirm_access_token', accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    // Refresh token — httpOnly, only sent to the refresh endpoint
    r.setCookie('csfirm_refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Lightweight flag — readable by frontend JS and Next.js middleware
    r.setCookie('csfirm_authenticated', '1', {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  /** Clear all auth cookies. */
  clearAuthCookies(reply: FastifyReply): void {
    const r = reply as any;
    r.clearCookie('csfirm_access_token', { path: '/' });
    r.clearCookie('csfirm_refresh_token', { path: '/api/auth/refresh' });
    r.clearCookie('csfirm_authenticated', { path: '/' });
  }
}
