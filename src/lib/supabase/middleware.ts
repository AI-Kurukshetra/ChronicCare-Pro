import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDashboardPathByRole, getRequiredRoleForPath, getUserRole } from '@/lib/auth/roles';

export async function updateSession(request: NextRequest) {
  const requestPath = request.nextUrl.pathname;
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userRole = getUserRole(user);
  const requiredRole = getRequiredRoleForPath(requestPath);

  if ((requestPath === '/login' || requestPath === '/signup') && user && userRole) {
    return redirectWithCookies(request, response, getDashboardPathByRole(userRole));
  }

  if (requiredRole && !user) {
    return redirectWithCookies(request, response, '/login');
  }

  if (requiredRole && userRole !== requiredRole) {
    if (userRole) {
      return redirectWithCookies(request, response, getDashboardPathByRole(userRole));
    }

    return redirectWithCookies(request, response, '/login');
  }

  return response;
}

function redirectWithCookies(request: NextRequest, source: NextResponse, targetPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of source.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
