<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\BackupService;
use App\Services\GoogleService;
use App\Support\CurrentUser;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

/**
 * The app always opens as the default local user. Anyone can optionally
 * "Sign in with Google"; while signed in, data is backed up to their Google Drive.
 */
class AuthController extends Controller
{
    public function __construct(protected GoogleService $google, protected BackupService $backup) {}

    public function me(): JsonResponse
    {
        $user = CurrentUser::get();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->is_default ? null : $user->email,
            'avatar_url' => $user->avatar_url,
            'is_default' => (bool) $user->is_default,
            'google_connected' => $user->isGoogle(),
            'google_configured' => $this->google->isConfigured(),
            'last_backup_at' => $user->last_backup_at?->toIso8601String(),
        ]);
    }

    /** Browser navigates here; we send it on to Google's consent screen. */
    public function redirect(Request $request): RedirectResponse
    {
        if (!$this->google->isConfigured()) {
            return redirect('/#settings?google=not-configured');
        }
        $state = Str::random(40);
        Settings::set('google_oauth_state', $state.'|'.time());

        return redirect()->away($this->google->authUrl($this->redirectUri($request), $state));
    }

    public function callback(Request $request): RedirectResponse
    {
        $saved = explode('|', (string) Settings::get('google_oauth_state', ''));
        Settings::set('google_oauth_state', '');

        if ($request->filled('error')) {
            return redirect('/#settings?google=cancelled');
        }
        if (($saved[0] ?? '') === '' || !hash_equals($saved[0], (string) $request->query('state'))
            || (time() - (int) ($saved[1] ?? 0)) > 900) {
            return redirect('/#settings?google=invalid-state');
        }

        try {
            $result = $this->google->exchangeCode((string) $request->query('code'), $this->redirectUri($request));
            $tokens = $result['tokens'];
            $profile = $result['profile'];
            $email = strtolower((string) ($profile['email'] ?? ''));
            if ($email === '') {
                throw new \RuntimeException('Google did not return an email address.');
            }

            $user = User::where('email', $email)->where('is_default', false)->first() ?? new User();
            $user->fill([
                'name' => $profile['name'] ?? $email,
                'email' => $email,
                'google_id' => $profile['sub'] ?? null,
                'avatar_url' => $profile['picture'] ?? null,
                'is_default' => false,
            ]);
            if (!$user->exists) {
                $user->password = bin2hex(random_bytes(16));
            }
            $user->google_access_token = $tokens['access_token'] ?? null;
            $user->google_token_expires_at = now()->addSeconds(max(60, (int) ($tokens['expires_in'] ?? 3600) - 60));
            if (!empty($tokens['refresh_token'])) {
                $user->google_refresh_token = $tokens['refresh_token'];
            }
            $user->save();
            CurrentUser::switchTo($user);
        } catch (Throwable $e) {
            report($e);

            return redirect('/#settings?google=failed&message='.rawurlencode(mb_substr($e->getMessage(), 0, 200)));
        }

        // First backup right after sign-in.
        try {
            $this->backup->backupToGoogle($user);
            $flag = 'connected';
        } catch (Throwable $e) {
            report($e);
            $flag = 'connected-backup-failed';
        }

        return redirect('/#settings?google='.$flag);
    }

    public function logout(): JsonResponse
    {
        $user = CurrentUser::get();
        if (!$user->is_default) {
            $this->google->revoke($user);
            $user->forceFill(['google_access_token' => null, 'google_refresh_token' => null, 'google_token_expires_at' => null])->save();
        }
        CurrentUser::switchTo(null);

        return $this->me();
    }

    private function redirectUri(Request $request): string
    {
        // Loopback redirect for Google "Desktop app" OAuth clients (any port is allowed).
        return 'http://127.0.0.1:'.$request->getPort().'/auth/google/callback';
    }
}
