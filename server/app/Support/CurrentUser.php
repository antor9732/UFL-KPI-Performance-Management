<?php

namespace App\Support;

use App\Models\User;

/**
 * Desktop app = one person at a time. The active account is stored in settings:
 * the default local user, or a Google account after "Sign in with Google".
 */
class CurrentUser
{
    public static function get(): User
    {
        $id = Settings::get('active_user_id');
        $user = $id ? User::find($id) : null;

        return $user ?? self::defaultUser();
    }

    public static function defaultUser(): User
    {
        $user = User::where('is_default', true)->first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@local',
                'password' => bin2hex(random_bytes(16)),
                'is_default' => true,
            ]);
        }

        return $user;
    }

    public static function switchTo(?User $user): void
    {
        Settings::set('active_user_id', $user && !$user->is_default ? (string) $user->id : '');
    }
}
