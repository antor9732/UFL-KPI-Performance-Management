<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Settings;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Uses a real SQLite file (backups copy the database file) and fakes Google's HTTP APIs.
 */
class GoogleBackupTest extends TestCase
{
    private string $dbFile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dbFile = storage_path('framework/testing/backup_test_'.bin2hex(random_bytes(4)).'.sqlite');
        File::ensureDirectoryExists(dirname($this->dbFile));
        touch($this->dbFile);
        config(['database.connections.sqlite.database' => $this->dbFile]);
        DB::purge('sqlite');
        Artisan::call('migrate', ['--force' => true]);
        Settings::flush();
    }

    protected function tearDown(): void
    {
        DB::disconnect();
        @unlink($this->dbFile);
        parent::tearDown();
    }

    private function configureGoogle(): void
    {
        $this->putJson('/api/v1/settings', ['google_client_id' => 'cid.apps.googleusercontent.com', 'google_client_secret' => 'secret'])
            ->assertOk()->assertJsonPath('google_configured', true)->assertJsonPath('google_client_secret_set', true);
    }

    private function fakeGoogle(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'at-1', 'refresh_token' => 'rt-1', 'expires_in' => 3600, 'id_token' => 'x']),
            'www.googleapis.com/oauth2/v3/userinfo' => Http::response(['sub' => '123', 'email' => 'Owner@Gmail.com', 'name' => 'Factory Owner', 'picture' => 'https://example.com/a.png']),
            'www.googleapis.com/drive/v3/files*' => fn (Request $r) => $r->method() === 'POST'
                ? Http::response(['id' => 'folder-1'])
                : Http::response(['files' => []]),
            'www.googleapis.com/upload/drive/v3/files*' => Http::response(['id' => 'file-1', 'name' => 'x.zip', 'size' => '100', 'createdTime' => '2026-11-24T10:00:00Z']),
        ]);
    }

    public function test_default_user_works_without_login(): void
    {
        $this->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('name', 'Admin')->assertJsonPath('is_default', true)->assertJsonPath('google_connected', false);
    }

    public function test_sign_in_with_google_creates_user_and_backs_up_to_drive(): void
    {
        $this->seed(DemoSeeder::class);
        $this->configureGoogle();
        $this->fakeGoogle();

        $redirect = $this->get('/auth/google/redirect');
        $redirect->assertRedirect();
        $url = $redirect->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $url);
        parse_str(parse_url($url, PHP_URL_QUERY), $q);
        $this->assertSame('cid.apps.googleusercontent.com', $q['client_id']);
        $this->assertStringContainsString('drive.file', $q['scope']);
        $this->assertSame('offline', $q['access_type']);
        $this->assertMatchesRegularExpression('#^http://127\.0\.0\.1:\d+/auth/google/callback$#', $q['redirect_uri']);

        $this->get('/auth/google/callback?code=abc&state='.$q['state'])->assertRedirect('/#settings?google=connected');

        $me = $this->getJson('/api/v1/auth/me')->assertOk()->json();
        $this->assertSame('owner@gmail.com', $me['email']);
        $this->assertTrue($me['google_connected']);
        $this->assertNotNull($me['last_backup_at']);

        // tokens are stored encrypted
        $raw = DB::table('users')->where('email', 'owner@gmail.com')->value('google_refresh_token');
        $this->assertNotSame('rt-1', $raw);
        $this->assertSame('rt-1', User::where('email', 'owner@gmail.com')->first()->google_refresh_token);

        // a zip with the database was uploaded into the backup folder
        Http::assertSent(function (Request $req) {
            return str_contains($req->url(), 'upload/drive/v3/files')
                && str_contains($req->body(), '"parents":["folder-1"]')
                && str_contains($req->body(), 'application/zip');
        });
    }

    public function test_state_mismatch_is_rejected(): void
    {
        $this->configureGoogle();
        $this->get('/auth/google/redirect');
        $this->get('/auth/google/callback?code=abc&state=wrong')->assertRedirect('/#settings?google=invalid-state');
        $this->getJson('/api/v1/auth/me')->assertJsonPath('is_default', true);
    }

    public function test_auto_backup_after_changes_when_signed_in_and_sign_out(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle();
        $user = User::create(['name' => 'G', 'email' => 'g@gmail.com', 'password' => 'x', 'google_refresh_token' => 'rt', 'google_access_token' => 'at', 'google_token_expires_at' => now()->addHour()]);
        Settings::set('active_user_id', (string) $user->id);

        $this->postJson('/api/v1/departments', ['code' => 'K', 'name' => 'K', 'kind' => 'lines', 'line_count' => 1])->assertCreated();
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'upload/drive/v3/files'));
        $this->assertNotNull($user->fresh()->last_backup_at);

        // throttled: a second change right away does not upload again
        $uploads = collect(Http::recorded())->filter(fn ($p) => str_contains($p[0]->url(), 'upload/drive'))->count();
        $this->postJson('/api/v1/departments', ['code' => 'K2', 'name' => 'K2', 'kind' => 'lines'])->assertCreated();
        $this->assertSame($uploads, collect(Http::recorded())->filter(fn ($p) => str_contains($p[0]->url(), 'upload/drive'))->count());

        $this->postJson('/api/v1/auth/logout')->assertOk()->assertJsonPath('is_default', true);
        $this->assertNull($user->fresh()->google_refresh_token);
    }

    public function test_local_backup_download_and_restore_round_trip(): void
    {
        $this->seed(DemoSeeder::class);
        $this->putJson('/api/v1/settings', ['company_name' => 'Before Backup Ltd.']);

        $res = $this->get('/api/v1/backup/download')->assertOk();
        $zipPath = $res->baseResponse->getFile()->getPathname();
        $copy = storage_path('framework/testing/copy.zip');
        copy($zipPath, $copy);

        // change data after the backup
        $this->putJson('/api/v1/settings', ['company_name' => 'After Change Ltd.']);
        $this->postJson('/api/v1/settings/reset-data', ['confirm' => 'DELETE'])->assertOk();
        $this->getJson('/api/v1/departments')->assertJsonCount(0);

        $this->post('/api/v1/backup/restore', ['file' => new UploadedFile($copy, 'backup.zip', 'application/zip', null, true)], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('ok', true);

        $this->getJson('/api/v1/settings')->assertJsonPath('company_name', 'Before Backup Ltd.');
        $this->assertCount(5, $this->getJson('/api/v1/departments')->json());
        @unlink($copy);
    }

    public function test_rejects_non_backup_zip(): void
    {
        $tmp = storage_path('framework/testing/bad.zip');
        $zip = new \ZipArchive();
        $zip->open($tmp, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('hello.txt', 'hi');
        $zip->close();
        $this->post('/api/v1/backup/restore', ['file' => new UploadedFile($tmp, 'bad.zip', 'application/zip', null, true)], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('error', 'This is not a valid KPI System backup file.');
        @unlink($tmp);
    }
}
