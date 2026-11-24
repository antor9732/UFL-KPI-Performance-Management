<?php

namespace App\Services;

use App\Models\User;
use App\Support\Settings;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Google sign-in (OAuth 2.0 for installed apps, loopback redirect) and
 * Google Drive storage for backups (drive.file scope: the app only sees
 * files it created itself).
 */
class GoogleService
{
    public const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    public const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    public const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
    public const DRIVE_URL = 'https://www.googleapis.com/drive/v3';
    public const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
    public const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';

    public function isConfigured(): bool
    {
        return $this->clientId() !== '' && $this->clientSecret() !== '';
    }

    public function clientId(): string
    {
        return (string) Settings::get('google_client_id', '');
    }

    public function clientSecret(): string
    {
        return (string) Settings::get('google_client_secret', '');
    }

    public function authUrl(string $redirectUri, string $state): string
    {
        return self::AUTH_URL.'?'.http_build_query([
            'client_id' => $this->clientId(),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => self::SCOPES,
            'access_type' => 'offline',
            'prompt' => 'consent select_account',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ]);
    }

    /** Exchange the authorization code; returns token array + profile. */
    public function exchangeCode(string $code, string $redirectUri): array
    {
        $tokens = $this->http()->asForm()->post(self::TOKEN_URL, [
            'code' => $code,
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);
        if (!$tokens->successful()) {
            throw new RuntimeException('Google sign-in failed: '.($tokens->json('error_description') ?? $tokens->body()));
        }

        $profile = $this->http()->withToken($tokens->json('access_token'))->get(self::USERINFO_URL);
        if (!$profile->successful()) {
            throw new RuntimeException('Could not read Google profile.');
        }

        return ['tokens' => $tokens->json(), 'profile' => $profile->json()];
    }

    public function accessToken(User $user): string
    {
        if ($user->google_access_token && $user->google_token_expires_at && $user->google_token_expires_at->isFuture()) {
            return $user->google_access_token;
        }
        if (!$user->google_refresh_token) {
            throw new RuntimeException('Google account is not connected. Please sign in with Google again.');
        }

        $res = $this->http()->asForm()->post(self::TOKEN_URL, [
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'refresh_token' => $user->google_refresh_token,
            'grant_type' => 'refresh_token',
        ]);
        if (!$res->successful()) {
            throw new RuntimeException('Google session expired. Please sign in with Google again.');
        }

        $user->google_access_token = $res->json('access_token');
        $user->google_token_expires_at = now()->addSeconds(max(60, (int) $res->json('expires_in', 3600) - 60));
        $user->save();

        return $user->google_access_token;
    }

    public function revoke(User $user): void
    {
        $token = $user->google_refresh_token ?: $user->google_access_token;
        if ($token) {
            try {
                $this->http()->asForm()->post('https://oauth2.googleapis.com/revoke', ['token' => $token]);
            } catch (\Throwable) {
                // offline: ignore, tokens are removed locally anyway
            }
        }
    }

    public function backupFolderName(): string
    {
        return trim((Settings::get('company_name') ?: 'KPI').' - KPI System Backups');
    }

    /** Find or create the backup folder in the user's Drive. */
    public function folderId(User $user): string
    {
        $token = $this->accessToken($user);
        $name = $this->backupFolderName();
        $q = sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            str_replace("'", "\\'", $name));

        $found = $this->http()->withToken($token)->get(self::DRIVE_URL.'/files', [
            'q' => $q, 'fields' => 'files(id,name)', 'spaces' => 'drive',
        ]);
        if ($found->successful() && !empty($found->json('files'))) {
            return $found->json('files.0.id');
        }

        $created = $this->http()->withToken($token)->post(self::DRIVE_URL.'/files?fields=id', [
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
        ]);
        if (!$created->successful() || !$created->json('id')) {
            throw new RuntimeException('Could not create the backup folder in Google Drive: '.$created->body());
        }

        return $created->json('id');
    }

    public function upload(User $user, string $path, string $fileName): array
    {
        $token = $this->accessToken($user);
        $folder = $this->folderId($user);
        $boundary = 'kpi'.bin2hex(random_bytes(8));
        $meta = json_encode(['name' => $fileName, 'parents' => [$folder], 'mimeType' => 'application/zip']);

        $body = "--{$boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{$meta}\r\n"
            ."--{$boundary}\r\nContent-Type: application/zip\r\n\r\n".file_get_contents($path)."\r\n"
            ."--{$boundary}--";

        $res = $this->http()->withToken($token)
            ->withBody($body, 'multipart/related; boundary='.$boundary)
            ->timeout(300)
            ->post(self::UPLOAD_URL.'?uploadType=multipart&fields=id,name,size,createdTime');
        if (!$res->successful()) {
            throw new RuntimeException('Google Drive upload failed: '.($res->json('error.message') ?? $res->body()));
        }

        return $res->json();
    }

    public function list(User $user): array
    {
        $token = $this->accessToken($user);
        $folder = $this->folderId($user);
        $res = $this->http()->withToken($token)->get(self::DRIVE_URL.'/files', [
            'q' => "'{$folder}' in parents and trashed = false",
            'orderBy' => 'createdTime desc',
            'pageSize' => 50,
            'fields' => 'files(id,name,size,createdTime)',
        ]);
        if (!$res->successful()) {
            throw new RuntimeException('Could not list Google Drive backups.');
        }

        return $res->json('files') ?? [];
    }

    public function download(User $user, string $fileId, string $target): void
    {
        $token = $this->accessToken($user);
        $res = $this->http()->withToken($token)->timeout(300)
            ->withOptions(['sink' => $target])
            ->get(self::DRIVE_URL.'/files/'.rawurlencode($fileId), ['alt' => 'media']);
        if (!$res->successful()) {
            throw new RuntimeException('Could not download the backup from Google Drive.');
        }
        if (!is_file($target) || filesize($target) === 0) {
            file_put_contents($target, $res->body());
        }
    }

    private function http(): PendingRequest
    {
        $req = Http::timeout(60)->acceptJson();
        $ca = self::caBundle();

        return $ca ? $req->withOptions(['verify' => $ca]) : $req;
    }

    /** Windows PHP has no system CA store: use the bundle shipped with the runtime. */
    public static function caBundle(): ?string
    {
        foreach ([ini_get('curl.cainfo'), base_path('../runtime/php/extras/ssl/cacert.pem')] as $candidate) {
            if ($candidate && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
